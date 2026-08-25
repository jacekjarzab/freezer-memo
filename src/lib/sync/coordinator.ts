import { applyPulledItems } from './repository';
import { acknowledgeOutboxOperation, deferOutboxOperation, getSyncMetadata, listPendingOutbox, saveSyncMetadata } from './outbox';
import type { ConnectivityPort, RemoteInventoryStore, SyncStatus } from './ports';

export interface SyncCoordinatorResult { status: SyncStatus; reason?: string }

export async function runForegroundSync(
  remote: RemoteInventoryStore,
  connectivity: ConnectivityPort,
  now = new Date(),
): Promise<SyncCoordinatorResult> {
  if (!connectivity.isOnline()) return { status: 'offline' };
  const metadata = await getSyncMetadata();
  if (metadata.migrationState === 'local' || !metadata.householdId) return { status: 'up_to_date' };
  const householdId = metadata.householdId;
  try {
    const pending = await listPendingOutbox(householdId, now.toISOString());
    for (const operation of pending) {
      const result = await remote.push(householdId, operation);
      if (!result.accepted) {
        if (result.error === 'forbidden') {
          await saveSyncMetadata({ migrationState: 'failed' });
          return { status: 'error', reason: 'forbidden' };
        }
        if (result.error === 'unavailable') {
          const delay = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(operation.attempts, 8));
          await deferOutboxOperation(operation.id, result.error, new Date(now.getTime() + delay).toISOString());
          return { status: 'retrying', reason: 'unavailable' };
        }
        await deferOutboxOperation(operation.id, result.error ?? 'invalid', new Date(now.getTime() + 60_000).toISOString());
        return { status: 'error', reason: result.error ?? 'invalid' };
      }
      if (result.item) await applyPulledItems([result.item]);
      await acknowledgeOutboxOperation(operation.id);
    }
    const pulled = await remote.pull(householdId, metadata.cursor);
    await applyPulledItems(pulled.items);
    await saveSyncMetadata({ cursor: pulled.nextCursor, lastSyncedAt: now.toISOString(), migrationState: 'complete' });
    return { status: 'up_to_date' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'sync_failed';
    await saveSyncMetadata({ migrationState: reason.toLowerCase().includes('membership') ? 'failed' : metadata.migrationState });
    return { status: reason.toLowerCase().includes('fetch') ? 'retrying' : 'error', reason };
  }
}
