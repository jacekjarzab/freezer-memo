import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { enqueueItemMutation, saveSyncMetadata } from './outbox';
import { runForegroundSync } from './coordinator';
import { migrateLocalInventory } from './repository';

const item = { id: 'item-1', status: 'in_freezer' as const, categoryKey: 'chicken' as const, cutKey: 'breast', freezerKey: 'home' as const, quantityType: 'pieces' as const, quantityValue: 1, quantityUnit: 'pcs', notes: '', frozenAt: '2026-08-01', takenOutAt: null, createdAt: '2026-08-01', updatedAt: '2026-08-01', householdId: 'household-1', serverRevision: null, deletedAt: null };
const online = { isOnline: () => true, subscribe: vi.fn(() => () => {}) };

beforeEach(async () => {
  await db.outbox.clear();
  await db.freezerItems.clear();
  await db.syncMetadata.clear();
  await saveSyncMetadata({ householdId: 'household-1', migrationState: 'complete', cursor: null, lastSyncedAt: null, nextOutboxSequence: 0 });
});

describe('foreground sync coordinator', () => {
  it('does not sync or complete a pending household before explicit migration', async () => {
    await saveSyncMetadata({ migrationState: 'pending' });
    const remote = { push: vi.fn(), pull: vi.fn() };
    await expect(runForegroundSync(remote, online)).resolves.toEqual({ status: 'up_to_date' });
    expect(remote.push).not.toHaveBeenCalled();
    expect(remote.pull).not.toHaveBeenCalled();
    expect(await db.syncMetadata.get('current')).toMatchObject({ migrationState: 'pending' });
  });

  it('resumes a queued migration on reconnect without another migration click', async () => {
    await saveSyncMetadata({ migrationState: 'pending' });
    await db.freezerItems.put(item);
    await migrateLocalInventory('household-1');
    const remote = { push: vi.fn().mockResolvedValue({ accepted: true, item: { ...item, serverRevision: 1 } }), pull: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    await expect(runForegroundSync(remote, online)).resolves.toMatchObject({ status: 'up_to_date' });
    expect(remote.push).toHaveBeenCalledTimes(1);
    expect(await db.syncMetadata.get('current')).toMatchObject({ migrationState: 'complete' });
  });

  it('pushes in order, acknowledges, pulls, and advances the cursor', async () => {
    await db.freezerItems.put(item);
    await enqueueItemMutation(item, 'household-1');
    const remote = { push: vi.fn().mockResolvedValue({ accepted: true, item: { ...item, serverRevision: 1 } }), pull: vi.fn().mockResolvedValue({ items: [{ ...item, id: 'remote', serverRevision: 2 }], nextCursor: '2' }) };
    await expect(runForegroundSync(remote, online)).resolves.toMatchObject({ status: 'up_to_date' });
    expect(await db.outbox.count()).toBe(0);
    expect(await db.syncMetadata.get('current')).toMatchObject({ cursor: '2', lastSyncedAt: expect.any(String) });
    expect(await db.freezerItems.get('remote')).toBeTruthy();
  });

  it('persists retry backoff without acknowledging unavailable work', async () => {
    await enqueueItemMutation(item, 'household-1');
    const remote = { push: vi.fn().mockResolvedValue({ accepted: false, item: null, error: 'unavailable' as const }), pull: vi.fn() };
    await expect(runForegroundSync(remote, online, new Date('2026-08-25T12:00:00Z'))).resolves.toMatchObject({ status: 'retrying' });
    expect(await db.outbox.count()).toBe(1);
    expect(await db.outbox.toCollection().first()).toMatchObject({ attempts: 1, nextAttemptAt: '2026-08-25T12:00:01.000Z' });
    expect(remote.pull).not.toHaveBeenCalled();
  });

  it('preserves outbox and marks recovery state on membership loss', async () => {
    await enqueueItemMutation(item, 'household-1');
    const remote = { push: vi.fn().mockResolvedValue({ accepted: false, item: null, error: 'forbidden' as const }), pull: vi.fn() };
    await expect(runForegroundSync(remote, online)).resolves.toMatchObject({ status: 'error', reason: 'forbidden' });
    expect(await db.outbox.count()).toBe(1);
    expect(await db.syncMetadata.get('current')).toMatchObject({ migrationState: 'failed' });
  });
});
