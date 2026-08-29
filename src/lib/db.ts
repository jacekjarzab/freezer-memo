import Dexie, { type EntityTable } from 'dexie';
import type { CategoryKey } from '../data/catalog';

export type InventoryStatus = 'in_freezer' | 'taken_out';
export type QuantityType = 'weight' | 'packs' | 'pieces';
export type FreezerKey = 'home' | 'basement' | 'away';

export interface FreezerItemRecord {
  id: string;
  status: InventoryStatus;
  categoryKey: CategoryKey;
  cutKey: string;
  freezerKey: FreezerKey;
  quantityType: QuantityType;
  quantityValue: number;
  quantityUnit: string;
  notes: string;
  frozenAt: string;
  takenOutAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set once the item is associated with a household. */
  householdId?: string | null;
  /** Server revision used for deterministic conflict resolution. */
  serverRevision?: number | null;
  /** Retained locally so deletes can be synchronized safely. */
  deletedAt?: string | null;
}

export interface SyncMetadataRecord {
  id: 'current';
  householdId: string | null;
  cursor: string | null;
  lastSyncedAt: string | null;
  migrationState: 'local' | 'pending' | 'migrating' | 'complete' | 'failed';
  nextOutboxSequence: number;
}

export type OutboxOperationKind = 'upsert_item' | 'delete_item';

export interface OutboxOperationRecord {
  id: string;
  /** Household captured when the mutation was created; never infer this later. */
  householdId: string;
  sequence: number;
  kind: OutboxOperationKind;
  itemId: string;
  payload: FreezerItemRecord | null;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
}

export interface PresetRecord {
  id: string;
  categoryKey: CategoryKey;
  cutKey: string;
  quantityType: QuantityType;
  quantityValue: number;
  quantityUnit: string;
  label: string;
  lastUsedAt: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

const freezerMemoDb = new Dexie('freezerMemoDb') as Dexie & {
  freezerItems: EntityTable<FreezerItemRecord, 'id'>;
  presets: EntityTable<PresetRecord, 'id'>;
  syncMetadata: EntityTable<SyncMetadataRecord, 'id'>;
  outbox: EntityTable<OutboxOperationRecord, 'id'>;
};

freezerMemoDb.version(1).stores({
  freezerItems:
    'id, status, categoryKey, cutKey, createdAt, updatedAt, frozenAt',
});

freezerMemoDb
  .version(2)
  .stores({
    freezerItems:
      'id, status, categoryKey, cutKey, createdAt, updatedAt, frozenAt',
    presets:
      'id, categoryKey, cutKey, quantityType, quantityValue, quantityUnit, lastUsedAt, createdAt, updatedAt',
  })
  .upgrade(async (transaction) => {
    await transaction.table('presets').clear();
  });

freezerMemoDb
  .version(3)
  .stores({
    freezerItems:
      'id, status, categoryKey, cutKey, freezerKey, createdAt, updatedAt, frozenAt',
    presets:
      'id, categoryKey, cutKey, quantityType, quantityValue, quantityUnit, lastUsedAt, createdAt, updatedAt',
  })
  .upgrade(async (transaction) => {
    await transaction
      .table('freezerItems')
      .toCollection()
      .modify((item: { freezerKey?: FreezerKey }) => {
        item.freezerKey ??= 'home';
      });
  });

freezerMemoDb
  .version(4)
  .stores({
    freezerItems:
      'id, status, categoryKey, cutKey, freezerKey, createdAt, updatedAt, frozenAt, householdId, serverRevision, deletedAt',
    presets:
      'id, categoryKey, cutKey, quantityType, quantityValue, quantityUnit, lastUsedAt, createdAt, updatedAt',
    syncMetadata: 'id, householdId, cursor, lastSyncedAt, migrationState',
    outbox: 'id, kind, itemId, createdAt, nextAttemptAt',
  })
  .upgrade(async (transaction) => {
    await transaction.table('syncMetadata').put({
      id: 'current',
      householdId: null,
      cursor: null,
      lastSyncedAt: null,
      migrationState: 'local',
      nextOutboxSequence: 0,
    });

    await transaction
      .table('freezerItems')
      .toCollection()
      .modify((item: FreezerItemRecord) => {
        item.householdId ??= null;
        item.serverRevision ??= null;
        item.deletedAt ??= null;
      });
  });

freezerMemoDb
  .version(5)
  .stores({
    freezerItems:
      'id, status, categoryKey, cutKey, freezerKey, createdAt, updatedAt, frozenAt, householdId, serverRevision, deletedAt',
    presets:
      'id, categoryKey, cutKey, quantityType, quantityValue, quantityUnit, lastUsedAt, createdAt, updatedAt',
    syncMetadata: 'id, householdId, cursor, lastSyncedAt, migrationState',
    outbox: 'id, householdId, sequence, kind, itemId, createdAt, nextAttemptAt',
  })
  .upgrade(async (transaction) => {
    const operations = await transaction.table('outbox').toArray();
    operations.sort(
      (left: { createdAt: string; id: string }, right: { createdAt: string; id: string }) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
    await transaction.table('outbox').bulkPut(
      operations.map((operation, index) => ({
        ...operation,
        sequence: index + 1,
      })),
    );
    const metadata = await transaction.table('syncMetadata').get('current');
    await transaction.table('syncMetadata').put({
      ...metadata,
      id: 'current',
      nextOutboxSequence: operations.length,
    });
  });

export const db = freezerMemoDb;
