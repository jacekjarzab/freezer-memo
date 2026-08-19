import { describe, expect, it, vi } from 'vitest';
import { classifySupabaseError, SupabaseHouseholdAdapter } from './adapters';

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
});
