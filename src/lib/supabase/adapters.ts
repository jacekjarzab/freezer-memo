import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthPort, AuthSession, PullResult, RemoteInventoryStore, SignUpResult } from '../sync/ports';
import type { FreezerItemRecord, OutboxOperationRecord } from '../db';

type RemoteRow = Record<string, unknown>;
export type HouseholdActionError = 'forbidden' | 'invite_invalid' | 'unavailable' | 'invalid' | 'auth_invalid' | 'auth_unconfirmed' | 'rate_limited';

export interface HouseholdPort {
  createHousehold(name: string): Promise<{ id: string; name: string }>;
  sendEmailInvite(householdId: string, inviteeEmail: string): Promise<{ id: string; expiresAt: string }>;
  createInvite(householdId: string): Promise<{ id: string; token: string; expiresAt: string }>;
  discoverHousehold(): Promise<{ id: string; name: string } | null>;
  listOutstandingInvites(householdId: string): Promise<Array<{ id: string; expiresAt: string }>>;
  listMembers(householdId: string): Promise<Array<{ userId: string; role: 'owner' | 'member' }>>;
  revokeInvite(inviteId: string): Promise<void>;
  removeMember(householdId: string, userId: string): Promise<void>;
  acceptInvite(token: string): Promise<string>;
}

export class SupabaseAdapterError extends Error {
  public readonly kind: HouseholdActionError;
  constructor(kind: HouseholdActionError, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'SupabaseAdapterError';
  }
}

export function classifySupabaseError(error: unknown): HouseholdActionError {
  const value = error as { code?: string; message?: string } | null;
  const message = value?.message?.toLowerCase() ?? '';
  if (
    message.includes('membership') ||
    message.includes('only household') ||
    message.includes('only household owner') ||
    message.includes('not owned by caller')
  ) return 'forbidden';
  if (message.includes('email not confirmed')) return 'auth_unconfirmed';
  if (message.includes('rate limit') || message.includes('too many requests')) return 'rate_limited';
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) return 'auth_invalid';
  if (message.includes('invite') || message.includes('expired') || message.includes('revoked')) return 'invite_invalid';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'unavailable';
  return 'invalid';
}

function throwAdapterError(error: unknown): never {
  throw new SupabaseAdapterError(classifySupabaseError(error), error instanceof Error ? error.message : 'Supabase request failed');
}

function unwrapRpcRow(data: unknown): RemoteRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new SupabaseAdapterError('invalid', 'Supabase returned an invalid response');
  return row as RemoteRow;
}

function toAuthSession(session: { user: { id: string; email?: string | null } } | null): AuthSession | null {
  return session ? { userId: session.user.id, email: session.user.email ?? null } : null;
}

function toItem(row: RemoteRow): FreezerItemRecord {
  if (typeof row.id !== 'string' || !row.id) {
    throw new SupabaseAdapterError('invalid', 'Supabase returned an item without an id');
  }
  return {
    id: String(row.id), status: row.status === 'taken_out' ? 'taken_out' : 'in_freezer',
    categoryKey: String(row.category_key) as FreezerItemRecord['categoryKey'], cutKey: String(row.cut_key),
    freezerKey: String(row.freezer_key) as FreezerItemRecord['freezerKey'],
    quantityType: String(row.quantity_type) as FreezerItemRecord['quantityType'], quantityValue: Number(row.quantity_value),
    quantityUnit: String(row.quantity_unit), notes: String(row.notes ?? ''), frozenAt: String(row.frozen_at),
    takenOutAt: row.taken_out_at ? String(row.taken_out_at) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    householdId: String(row.household_id), serverRevision: Number(row.server_revision), deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

export class SupabaseAuthAdapter implements AuthPort {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throwAdapterError(error);
    return toAuthSession(data.session);
  }
  async signUp(email: string, password: string, redirectUrl: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } });
    if (error) throwAdapterError(error);
    return {
      session: toAuthSession(data.session),
      requiresConfirmation: Boolean(data.user && !data.session),
      // Supabase returns an obfuscated user with no identities for an existing
      // email when email confirmation is enabled.
      accountExists: Boolean(data.user && data.user.identities?.length === 0),
    };
  }
  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throwAdapterError(error);
    const session = toAuthSession(data.session);
    if (!session) throw new SupabaseAdapterError('invalid', 'Supabase did not return a session');
    return session;
  }
  async requestPasswordReset(email: string, redirectUrl: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (error) throwAdapterError(error);
  }
  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throwAdapterError(error);
  }
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => listener(toAuthSession(session)));
    return () => data.subscription.unsubscribe();
  }
  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throwAdapterError(error);
  }
}

export class SupabaseInventoryAdapter implements RemoteInventoryStore {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  async pull(householdId: string, cursor: string | null): Promise<PullResult> {
    let query = this.client.from('freezer_items').select('*').eq('household_id', householdId).order('server_revision', { ascending: true });
    if (cursor) query = query.gt('server_revision', Number(cursor));
    const { data, error } = await query;
    if (error) throwAdapterError(error);
    const items = (data ?? []).map((row) => toItem(row as RemoteRow));
    return { items, nextCursor: items.length ? String(Math.max(...items.map((item) => item.serverRevision ?? 0))) : cursor };
  }
  async push(householdId: string, operation: OutboxOperationRecord) {
    const { data, error } = await this.client.rpc('apply_freezer_mutation', {
      target_household_id: householdId, mutation_id: operation.id, mutation_kind: operation.kind, item: operation.payload,
    });
    if (error) {
      const kind = classifySupabaseError(error);
      const syncError: 'forbidden' | 'unavailable' | 'invalid' = kind === 'forbidden' ? 'forbidden' : kind === 'unavailable' ? 'unavailable' : 'invalid';
      return { accepted: false, item: null, error: syncError };
    }
    return { accepted: true, item: data ? toItem(unwrapRpcRow(data)) : null };
  }
}

export class SupabaseHouseholdAdapter implements HouseholdPort {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }
  async createHousehold(name: string) {
    const { data, error } = await this.client.rpc('create_household', { household_name: name });
    if (error) throwAdapterError(error);
    const row = unwrapRpcRow(data);
    return { id: String(row.id), name: String(row.name) };
  }
  async sendEmailInvite(householdId: string, inviteeEmail: string) {
    const { data, error } = await this.client.functions.invoke('send-household-invite', {
      body: { householdId, inviteeEmail },
    });
    if (error) throwAdapterError(error);
    if (!data || typeof data.inviteId !== 'string' || typeof data.expiresAt !== 'string') {
      throw new SupabaseAdapterError('invalid', 'Supabase returned an invalid email invite');
    }
    return { id: data.inviteId, expiresAt: data.expiresAt };
  }
  async createInvite(householdId: string) {
    const { data, error } = await this.client.rpc('create_household_invite', { target_household_id: householdId });
    if (error) throwAdapterError(error);
    const row = unwrapRpcRow(data);
    return { id: String(row.invite_id), token: String(row.invite_token), expiresAt: String(row.expires_at) };
  }
  async discoverHousehold() {
    const { data, error } = await this.client.from('households').select('id, name').maybeSingle();
    if (error) throwAdapterError(error);
    if (!data) return null;
    const row = unwrapRpcRow(data);
    return { id: String(row.id), name: String(row.name) };
  }
  async listOutstandingInvites(householdId: string) {
    const { data, error } = await this.client
      .from('household_invites')
      .select('id, expires_at')
      .eq('household_id', householdId)
      .is('revoked_at', null)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (error) throwAdapterError(error);
    return (data ?? []).map((row) => {
      const invite = unwrapRpcRow(row);
      if (typeof invite.id !== 'string' || typeof invite.expires_at !== 'string') {
        throw new SupabaseAdapterError('invalid', 'Supabase returned an invalid invite');
      }
      return { id: invite.id, expiresAt: invite.expires_at };
    });
  }
  async revokeInvite(inviteId: string) {
    const { error } = await this.client.rpc('revoke_household_invite', { target_invite_id: inviteId });
    if (error) throwAdapterError(error);
  }
  async listMembers(householdId: string) {
    const { data, error } = await this.client.from('household_members').select('user_id, role').eq('household_id', householdId);
    if (error) throwAdapterError(error);
    return (data ?? []).map((row) => {
      const member = unwrapRpcRow(row);
      if (typeof member.user_id !== 'string' || (member.role !== 'owner' && member.role !== 'member')) {
        throw new SupabaseAdapterError('invalid', 'Supabase returned an invalid household member');
      }
      return { userId: member.user_id, role: member.role as 'owner' | 'member' };
    });
  }
  async removeMember(householdId: string, userId: string) {
    const { error } = await this.client.rpc('remove_household_member', { target_household_id: householdId, target_user_id: userId });
    if (error) throwAdapterError(error);
  }
  async acceptInvite(token: string) {
    const { data, error } = await this.client.rpc('accept_household_invite', { invite_token: token });
    if (error) throwAdapterError(error);
    return String(data);
  }
}
