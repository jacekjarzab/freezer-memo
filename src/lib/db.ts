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

export const db = freezerMemoDb;
