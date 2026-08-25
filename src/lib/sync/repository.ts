import { db, type FreezerItemRecord, type OutboxOperationKind } from '../db';
import { enqueueItemMutation, getSyncMetadata } from './outbox';

const sharedMutationListeners = new Set<() => void>();

export function subscribeToSharedMutations(listener: () => void): () => void {
  sharedMutationListeners.add(listener);
  return () => sharedMutationListeners.delete(listener);
}

function notifySharedMutation() {
  for (const listener of sharedMutationListeners) listener();
}

async function saveMutation(
  item: FreezerItemRecord,
  kind: OutboxOperationKind = 'upsert_item',
): Promise<FreezerItemRecord> {
  const metadata = await getSyncMetadata();
  const householdId = metadata.householdId;
  const shared = metadata.migrationState === 'complete' && householdId !== null;
  if (!shared) {
    await db.freezerItems.put(item);
    return item;
  }
  await db.transaction('rw', db.freezerItems, db.outbox, db.syncMetadata, async () => {
    await db.freezerItems.put({ ...item, householdId });
    await enqueueItemMutation({ ...item, householdId }, householdId, kind);
  });
  notifySharedMutation();
  return { ...item, householdId };
}

export function createLocalItem(item: FreezerItemRecord) {
  return saveMutation(item);
}

export async function updateLocalItem(
  id: string,
  changes: Partial<FreezerItemRecord>,
): Promise<FreezerItemRecord> {
  const current = await db.freezerItems.get(id);
  if (!current) throw new Error('missing_item');
  return saveMutation({ ...current, ...changes, id });
}

export async function deleteLocalItem(id: string): Promise<FreezerItemRecord> {
  const current = await db.freezerItems.get(id);
  if (!current) throw new Error('missing_item');
  return saveMutation({ ...current, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, 'delete_item');
}

export async function migrateLocalInventory(householdId: string): Promise<number> {
  let queued = 0;
  await db.transaction('rw', db.freezerItems, db.outbox, db.syncMetadata, async () => {
    const metadata = await db.syncMetadata.get('current');
    if (!metadata || metadata.householdId !== householdId) throw new Error('invalid_migration_state');
    if (metadata.migrationState === 'migrating') return;
    if (metadata.migrationState !== 'pending') throw new Error('invalid_migration_state');
    await db.syncMetadata.put({ ...metadata, migrationState: 'migrating' });
    const items = await db.freezerItems.toArray();
    for (const item of items) {
      const sharedItem = { ...item, householdId, serverRevision: null };
      await db.freezerItems.put(sharedItem);
      await enqueueItemMutation(sharedItem, householdId);
      queued += 1;
    }
  });
  return queued;
}

export async function applyPulledItems(items: FreezerItemRecord[]): Promise<void> {
  await db.transaction('rw', db.freezerItems, async () => {
    for (const item of items) {
      const local = await db.freezerItems.get(item.id);
      if (!local || (item.serverRevision ?? 0) >= (local.serverRevision ?? 0)) {
        await db.freezerItems.put(item);
      }
    }
  });
}
