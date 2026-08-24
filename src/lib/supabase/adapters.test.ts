import { describe, expect, it, vi } from 'vitest';
import { classifySupabaseError, SupabaseHouseholdAdapter, SupabaseInventoryAdapter } from './adapters';

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
  it('does not mistake unrelated not-found errors for membership loss', () => {
    expect(classifySupabaseError({ code: 'PGRST116', message: 'No rows found' })).toBe('invalid');
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
