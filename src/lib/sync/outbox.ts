import {
  db,
  type FreezerItemRecord,
  type OutboxOperationKind,
  type OutboxOperationRecord,
  type SyncMetadataRecord,
} from '../db';

export const CURRENT_SYNC_METADATA_ID: SyncMetadataRecord['id'] = 'current';

export const defaultSyncMetadata = (): SyncMetadataRecord => ({
  id: CURRENT_SYNC_METADATA_ID,
  householdId: null,
  cursor: null,
  lastSyncedAt: null,
  migrationState: 'local',
  nextOutboxSequence: 0,
});

export async function getSyncMetadata(): Promise<SyncMetadataRecord> {
  const metadata = await db.syncMetadata.get(CURRENT_SYNC_METADATA_ID);
  return metadata ?? defaultSyncMetadata();
}

export async function saveSyncMetadata(
  changes: Partial<Omit<SyncMetadataRecord, 'id'>>,
): Promise<SyncMetadataRecord> {
  const metadata = { ...(await getSyncMetadata()), ...changes };
  await db.syncMetadata.put(metadata);
  return metadata;
}

export function createOutboxOperation(
  item: FreezerItemRecord,
  householdId: string,
  kind: OutboxOperationKind,
  sequence: number,
  now = new Date().toISOString(),
): OutboxOperationRecord {
  return {
    id: crypto.randomUUID(),
    householdId,
    sequence,
    kind,
    itemId: item.id,
    payload: item,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
  };
}

export async function enqueueItemMutation(
  item: FreezerItemRecord,
  householdId: string,
  kind: OutboxOperationKind = 'upsert_item',
  now = new Date().toISOString(),
): Promise<OutboxOperationRecord> {
  let operation: OutboxOperationRecord | undefined;
  await db.transaction('rw', db.outbox, db.syncMetadata, async () => {
    const metadata =
      (await db.syncMetadata.get(CURRENT_SYNC_METADATA_ID)) ??
      defaultSyncMetadata();
    const sequence = metadata.nextOutboxSequence + 1;
    operation = createOutboxOperation(item, householdId, kind, sequence, now);
    await db.syncMetadata.put({ ...metadata, nextOutboxSequence: sequence });
    await db.outbox.add(operation);
  });
  if (!operation) throw new Error('outbox_enqueue_failed');
  return operation;
}

export async function listPendingOutbox(
  householdId: string,
  now = new Date().toISOString(),
): Promise<OutboxOperationRecord[]> {
  return db.outbox
    .orderBy('sequence')
    .filter(
      (operation) =>
        operation.householdId === householdId &&
        (operation.nextAttemptAt === null || operation.nextAttemptAt <= now),
    )
    .toArray();
}

export async function acknowledgeOutboxOperation(operationId: string) {
  await db.outbox.delete(operationId);
}

export async function deferOutboxOperation(
  operationId: string,
  error: string,
  nextAttemptAt: string,
): Promise<void> {
  const operation = await db.outbox.get(operationId);
  if (!operation) return;

  await db.outbox.put({
    ...operation,
    attempts: operation.attempts + 1,
    nextAttemptAt,
    lastError: error,
  });
}
