import { describe, expect, it, vi } from 'vitest';
import { classifySupabaseError, SupabaseAuthAdapter, SupabaseHouseholdAdapter, SupabaseInventoryAdapter } from './adapters';

describe('Supabase adapter error classification', () => {
  it('classifies membership loss as forbidden', () => {
    expect(classifySupabaseError({ message: 'household membership required' })).toBe('forbidden');
  });
  it('classifies expired invites for recovery UI', () => {
    expect(classifySupabaseError({ message: 'invite is invalid, expired, or revoked' })).toBe('invite_invalid');
  });
  it('classifies transport failures as unavailable', () => {
    expect(classifySupabaseError({ message: 'Failed to fetch' })).toBe('unavailable');
  });
  it('classifies authentication failures distinctly', () => {
    expect(classifySupabaseError({ message: 'Invalid login credentials' })).toBe('auth_invalid');
    expect(classifySupabaseError({ message: 'Email not confirmed' })).toBe('auth_unconfirmed');
    expect(classifySupabaseError({ message: 'Too many requests' })).toBe('rate_limited');
  });
  it('does not mistake unrelated not-found errors for membership loss', () => {
    expect(classifySupabaseError({ code: 'PGRST116', message: 'No rows found' })).toBe('invalid');
  });
});

describe('Supabase auth adapter', () => {
  it('maps signup confirmation and password login results', async () => {
    const auth = {
      signUp: vi.fn().mockResolvedValueOnce({ data: { user: { id: 'user-1' }, session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValueOnce({ data: { session: { user: { id: 'user-1', email: 'user@example.com' } } }, error: null }),
    };
    const adapter = new SupabaseAuthAdapter({ auth } as never);

    await expect(adapter.signUp('user@example.com', 'password-123', 'https://example.com')).resolves.toEqual({
      session: null,
      requiresConfirmation: true,
    });
    await expect(adapter.signInWithPassword('user@example.com', 'password-123')).resolves.toEqual({
      userId: 'user-1',
      email: 'user@example.com',
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com', password: 'password-123', options: { emailRedirectTo: 'https://example.com' },
    });
  });

  it('supports password recovery, password updates, and auth state subscriptions', async () => {
    const unsubscribe = vi.fn();
    const auth = {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn((listener: (event: string, session: unknown) => void) => {
        listener('SIGNED_IN', { user: { id: 'user-1', email: 'user@example.com' } });
        return { data: { subscription: { unsubscribe } } };
      }),
    };
    const adapter = new SupabaseAuthAdapter({ auth } as never);
    const listener = vi.fn();

    await adapter.requestPasswordReset('user@example.com', 'https://example.com');
    await adapter.updatePassword('new-password-123');
    const cleanup = adapter.onAuthStateChange(listener);
    cleanup();

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', { redirectTo: 'https://example.com' });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
    expect(listener).toHaveBeenCalledWith({ userId: 'user-1', email: 'user@example.com' });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('Supabase household adapter mapping', () => {
  it('maps both object and row-array RPC responses', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: 'household-1', name: 'Home' }], error: null })
      .mockResolvedValueOnce({ data: { invite_id: 'invite-1', invite_token: 'token-1', expires_at: '2026-08-26T00:00:00Z' }, error: null });
    const adapter = new SupabaseHouseholdAdapter({ rpc } as never);

    await expect(adapter.createHousehold('Home')).resolves.toEqual({ id: 'household-1', name: 'Home' });
    await expect(adapter.createInvite('household-1')).resolves.toEqual({
      id: 'invite-1', token: 'token-1', expiresAt: '2026-08-26T00:00:00Z',
    });
  });

  it('discovers membership and lists only revocable invite metadata', async () => {
    const householdQuery = {
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'household-1', name: 'Home' }, error: null }),
    };
    const inviteQuery = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'invite-1', expires_at: '2026-08-26T00:00:00Z' }], error: null }),
    };
    const from = vi.fn().mockReturnValueOnce(householdQuery).mockReturnValueOnce(inviteQuery);
    const adapter = new SupabaseHouseholdAdapter({ from } as never);

    await expect(adapter.discoverHousehold()).resolves.toEqual({ id: 'household-1', name: 'Home' });
    await expect(adapter.listOutstandingInvites('household-1')).resolves.toEqual([
      { id: 'invite-1', expiresAt: '2026-08-26T00:00:00Z' },
    ]);
    expect(inviteQuery.select).toHaveBeenCalledWith('id, expires_at');
  });

  it('lists members and removes them only through the dedicated RPC', async () => {
    const memberQuery = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({
        data: [{ user_id: 'owner-1', role: 'owner' }, { user_id: 'member-1', role: 'member' }], error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const adapter = new SupabaseHouseholdAdapter({ from: vi.fn().mockReturnValue(memberQuery), rpc } as never);

    await expect(adapter.listMembers('household-1')).resolves.toEqual([
      { userId: 'owner-1', role: 'owner' }, { userId: 'member-1', role: 'member' },
    ]);
    await expect(adapter.removeMember('household-1', 'member-1')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('remove_household_member', {
      target_household_id: 'household-1', target_user_id: 'member-1',
    });
  });
});

describe('Supabase inventory adapter mapping', () => {
  const operation = {
    id: 'mutation-1', householdId: 'household-1', sequence: 1, kind: 'upsert_item' as const,
    itemId: 'item-1', payload: {
      id: 'item-1', status: 'in_freezer' as const, categoryKey: 'beef' as const, cutKey: 'steak', freezerKey: 'home' as const,
      quantityType: 'pieces' as const, quantityValue: 1, quantityUnit: 'pcs', notes: '', frozenAt: '2026-08-24',
      takenOutAt: null, createdAt: '2026-08-24', updatedAt: '2026-08-24', householdId: 'household-1', serverRevision: null, deletedAt: null,
    }, createdAt: '2026-08-24T00:00:00Z',
    attempts: 0, nextAttemptAt: null, lastError: null,
  };

  it('maps row-array mutation responses', async () => {
    const adapter = new SupabaseInventoryAdapter({ rpc: vi.fn().mockResolvedValue({
      data: [{ id: 'item-1', status: 'in_freezer', category_key: 'beef', cut_key: 'steak', freezer_key: 'home', quantity_type: 'pieces', quantity_value: 1, quantity_unit: 'pcs', notes: '', frozen_at: '2026-08-24', created_at: '2026-08-24', updated_at: '2026-08-24', household_id: 'household-1', server_revision: 1, deleted_at: null }], error: null,
    }) } as never);

    await expect(adapter.push('household-1', operation)).resolves.toMatchObject({ accepted: true, item: { id: 'item-1' } });
  });

  it('rejects malformed mutation responses instead of accepting an invalid item', async () => {
    const adapter = new SupabaseInventoryAdapter({ rpc: vi.fn().mockResolvedValue({ data: [{ status: 'in_freezer' }], error: null }) } as never);

    await expect(adapter.push('household-1', operation)).rejects.toMatchObject({ kind: 'invalid' });
  });
});
