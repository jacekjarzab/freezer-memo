import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';

const legacyItem = {
  id: 'legacy-item',
  status: 'in_freezer' as const,
  categoryKey: 'chicken' as const,
  cutKey: 'breast',
  freezerKey: 'home' as const,
  quantityType: 'weight' as const,
  quantityValue: 500,
  quantityUnit: 'g',
  notes: '',
  frozenAt: '2026-08-01T10:00:00.000Z',
  takenOutAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

describe('Dexie sync migration', () => {
  beforeEach(async () => {
    db.close();
    await db.delete();

    const legacy = new Dexie('freezerMemoDb');
    legacy.version(3).stores({
      freezerItems:
        'id, status, categoryKey, cutKey, freezerKey, createdAt, updatedAt, frozenAt',
      presets:
        'id, categoryKey, cutKey, quantityType, quantityValue, quantityUnit, lastUsedAt, createdAt, updatedAt',
    });
    await legacy.open();
    await legacy.table('freezerItems').add(legacyItem);
    legacy.close();
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it('retains v3 items and initializes v4 sync state', async () => {
    await db.open();

    expect(await db.freezerItems.get('legacy-item')).toMatchObject({
      id: 'legacy-item',
      householdId: null,
      serverRevision: null,
      deletedAt: null,
    });
    expect(await db.syncMetadata.get('current')).toEqual({
      id: 'current',
      householdId: null,
      cursor: null,
      lastSyncedAt: null,
      migrationState: 'local',
      nextOutboxSequence: 0,
    });
    expect(await db.outbox.count()).toBe(0);
  });

  it('backfills sequences for queued v4 mutations', async () => {
    db.close();
    await db.delete();

    const legacy = new Dexie('freezerMemoDb');
    legacy.version(4).stores({
      freezerItems:
        'id, status, categoryKey, cutKey, freezerKey, createdAt, updatedAt, frozenAt, householdId, serverRevision, deletedAt',
      presets:
        'id, categoryKey, cutKey, quantityType, quantityValue, quantityUnit, lastUsedAt, createdAt, updatedAt',
      syncMetadata: 'id, householdId, cursor, lastSyncedAt, migrationState',
      outbox: 'id, kind, itemId, createdAt, nextAttemptAt',
    });
    await legacy.open();
    await legacy.table('syncMetadata').put({
      id: 'current',
      householdId: 'household-a',
      cursor: null,
      lastSyncedAt: null,
      migrationState: 'pending',
    });
    await legacy.table('outbox').bulkAdd([
      {
        id: 'later',
        householdId: 'household-a',
        kind: 'delete_item',
        itemId: 'item-1',
        payload: null,
        createdAt: '2026-08-18T10:00:00.002Z',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
      },
      {
        id: 'earlier',
        householdId: 'household-a',
        kind: 'upsert_item',
        itemId: 'item-1',
        payload: null,
        createdAt: '2026-08-18T10:00:00.001Z',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
      },
    ]);
    legacy.close();

    await db.open();
    const operations = await db.outbox.orderBy('sequence').toArray();
    expect(operations.map((operation) => [operation.id, operation.sequence])).toEqual([
      ['earlier', 1],
      ['later', 2],
    ]);
    expect((await db.syncMetadata.get('current'))?.nextOutboxSequence).toBe(2);
  });
});
