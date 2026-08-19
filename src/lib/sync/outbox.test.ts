import { describe, expect, it } from 'vitest';
import { db, type FreezerItemRecord } from '../db';
import {
  acknowledgeOutboxOperation,
  createOutboxOperation,
  defaultSyncMetadata,
  deferOutboxOperation,
  enqueueItemMutation,
  listPendingOutbox,
} from './outbox';

const item: FreezerItemRecord = {
  id: 'item-1',
  status: 'in_freezer',
  categoryKey: 'chicken',
  cutKey: 'breast',
  freezerKey: 'home',
  quantityType: 'weight',
  quantityValue: 500,
  quantityUnit: 'g',
  notes: '',
  frozenAt: '2026-08-01T10:00:00.000Z',
  takenOutAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

describe('sync outbox contracts', () => {
  it('creates an idempotent upsert envelope from a local snapshot', () => {
    const operation = createOutboxOperation(
      item,
      'household-a',
      'upsert_item',
      7,
      '2026-08-18T10:00:00.000Z',
    );

    expect(operation).toMatchObject({
      kind: 'upsert_item',
      householdId: 'household-a',
      sequence: 7,
      itemId: 'item-1',
      payload: item,
      createdAt: '2026-08-18T10:00:00.000Z',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    });
    expect(operation.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('represents deletes with a stable item id and tombstone payload', () => {
    const operation = createOutboxOperation(
      { ...item, deletedAt: '2026-08-18T10:00:00.000Z' },
      'household-a',
      'delete_item',
      8,
    );

    expect(operation.itemId).toBe('item-1');
    expect(operation.payload?.deletedAt).toBe('2026-08-18T10:00:00.000Z');
  });

  it('defaults new devices to local-only mode', () => {
    expect(defaultSyncMetadata()).toEqual({
      id: 'current',
      householdId: null,
      cursor: null,
      lastSyncedAt: null,
      migrationState: 'local',
      nextOutboxSequence: 0,
    });
  });

  it('persists ordered mutations and isolates them by originating household', async () => {
    await db.outbox.clear();
    const first = await enqueueItemMutation(
      { ...item, id: 'same-item', createdAt: '2026-08-18T10:00:00.000Z' },
      'household-a',
      'upsert_item',
      '2026-08-18T10:00:00.000Z',
    );
    const otherHousehold = await enqueueItemMutation(
      { ...item, id: 'other' },
      'household-b',
      'upsert_item',
      '2026-08-18T10:00:00.000Z',
    );
    const second = await enqueueItemMutation(
      { ...item, id: 'same-item', createdAt: '2026-08-18T10:00:00.000Z' },
      'household-a',
      'delete_item',
      '2026-08-18T10:00:00.000Z',
    );

    const pending = await listPendingOutbox('household-a');
    expect(pending.map((entry) => entry.kind)).toEqual([
      'upsert_item',
      'delete_item',
    ]);
    expect(pending[0].sequence).toBeLessThan(pending[1].sequence);
    expect(pending[0].createdAt).toBe(pending[1].createdAt);

    await deferOutboxOperation(
      first.id,
      'temporary_failure',
      '2026-08-18T12:00:00.000Z',
    );
    expect(
      await listPendingOutbox('household-a', '2026-08-18T11:30:00.000Z'),
    ).toEqual([second]);
    expect(await db.outbox.get(first.id)).toMatchObject({
      attempts: 1,
      lastError: 'temporary_failure',
      nextAttemptAt: '2026-08-18T12:00:00.000Z',
    });

    await acknowledgeOutboxOperation(otherHousehold.id);
    expect(await db.outbox.get(otherHousehold.id)).toBeUndefined();
  });
});
