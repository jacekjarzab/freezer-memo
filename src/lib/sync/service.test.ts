import { describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { saveSyncMetadata } from './outbox';
import { createLocalItem, migrateLocalInventory } from './repository';
import { createSharedSyncServiceFor, getSyncIndicatorTone } from './service';
import type { ConnectivityPort, RemoteInventoryStore } from './ports';

const item = {
  id: 'service-item', status: 'in_freezer' as const, categoryKey: 'chicken' as const,
  cutKey: 'breast', freezerKey: 'home' as const, quantityType: 'pieces' as const,
  quantityValue: 1, quantityUnit: 'pcs', notes: '', frozenAt: '2026-08-25',
  takenOutAt: null, createdAt: '2026-08-25', updatedAt: '2026-08-25',
  householdId: null, serverRevision: null, deletedAt: null,
};

function connectivity(): ConnectivityPort {
  return { isOnline: () => true, subscribe: () => () => undefined };
}

describe('app-level shared sync service', () => {
  it.each([
    ['up_to_date', 'up-to-date'], ['syncing', 'needs-attention'],
    ['retrying', 'needs-attention'], ['error', 'needs-attention'], ['offline', 'offline'],
  ] as const)('maps %s to the %s indicator tone', (status, tone) => {
    expect(getSyncIndicatorTone(status)).toBe(tone);
  });

  it('syncs a shared mutation without a Settings mount', async () => {
    await db.freezerItems.clear();
    await db.outbox.clear();
    await saveSyncMetadata({ householdId: 'household-1', migrationState: 'complete', cursor: null, nextOutboxSequence: 0 });
    const push = vi.fn().mockResolvedValue({ accepted: true, item: null });
    const remote: RemoteInventoryStore = { push, pull: vi.fn().mockResolvedValue({ items: [], nextCursor: '1' }) };
    const service = createSharedSyncServiceFor(remote, connectivity());
    const stop = service.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    push.mockClear();

    await createLocalItem(item);
    await vi.waitFor(() => expect(service.getStatus()).toBe('up_to_date'));

    expect(push).toHaveBeenCalledOnce();
    stop();
  });

  it('does not lose an explicit migration request behind an active sync', async () => {
    await db.freezerItems.clear();
    await db.outbox.clear();
    await saveSyncMetadata({ householdId: 'household-1', migrationState: 'complete', cursor: null, nextOutboxSequence: 0 });
    await db.freezerItems.put(item);
    let resolvePull!: (result: { items: never[]; nextCursor: string }) => void;
    const pull = new Promise<{ items: never[]; nextCursor: string }>((resolve) => {
      resolvePull = resolve;
    });
    const push = vi.fn().mockResolvedValue({ accepted: true, item: null });
    const remote: RemoteInventoryStore = {
      push,
      pull: vi.fn().mockReturnValue(pull),
    };
    const service = createSharedSyncServiceFor(remote, connectivity());
    const stop = service.start();
    await vi.waitFor(() => expect(remote.pull).toHaveBeenCalledOnce());

    await saveSyncMetadata({ migrationState: 'pending' });
    await migrateLocalInventory('household-1');
    const migration = service.syncNow(true);
    resolvePull({ items: [], nextCursor: '1' });
    await expect(migration).resolves.toMatchObject({ status: 'up_to_date' });

    expect(push).toHaveBeenCalledOnce();
    expect(await db.syncMetadata.get('current')).toMatchObject({ migrationState: 'complete' });
    stop();
  });
});
