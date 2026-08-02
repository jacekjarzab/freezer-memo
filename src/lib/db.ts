import Dexie, { type EntityTable } from 'dexie'
import type { CategoryKey } from '../data/catalog'

export type InventoryStatus = 'in_freezer' | 'taken_out'
export type QuantityType = 'weight' | 'packs' | 'pieces'

export interface FreezerItemRecord {
  id: string
  status: InventoryStatus
  categoryKey: CategoryKey
  cutKey: string
  quantityType: QuantityType
  quantityValue: number
  quantityUnit: string
  notes: string
  frozenAt: string
  takenOutAt: string | null
  createdAt: string
  updatedAt: string
}

const freezerMemoDb = new Dexie('freezerMemoDb') as Dexie & {
  freezerItems: EntityTable<FreezerItemRecord, 'id'>
}

freezerMemoDb.version(1).stores({
  freezerItems: 'id, status, categoryKey, cutKey, createdAt, updatedAt, frozenAt',
})

export const db = freezerMemoDb
