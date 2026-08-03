import { CATEGORY_KEYS } from '../data/catalog'
import { db, type FreezerItemRecord } from './db'

const VALID_STATUSES = ['in_freezer', 'taken_out'] as const
const VALID_QUANTITY_TYPES = ['weight', 'packs', 'pieces'] as const

export interface BackupPayload {
  version: 1
  exportedAt: string
  itemCount: number
  items: FreezerItemRecord[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isFreezerItemRecord(value: unknown): value is FreezerItemRecord {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    VALID_STATUSES.includes(value.status as (typeof VALID_STATUSES)[number]) &&
    CATEGORY_KEYS.includes(value.categoryKey as (typeof CATEGORY_KEYS)[number]) &&
    typeof value.cutKey === 'string' &&
    VALID_QUANTITY_TYPES.includes(
      value.quantityType as (typeof VALID_QUANTITY_TYPES)[number],
    ) &&
    typeof value.quantityValue === 'number' &&
    Number.isFinite(value.quantityValue) &&
    typeof value.quantityUnit === 'string' &&
    typeof value.notes === 'string' &&
    isIsoDate(value.frozenAt) &&
    (value.takenOutAt === null || isIsoDate(value.takenOutAt)) &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  )
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const items = await db.freezerItems.toArray()

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  }
}

export function parseBackupPayload(rawText: string): BackupPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('invalid_json')
  }

  if (!isRecord(parsed)) {
    throw new Error('invalid_shape')
  }

  if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
    throw new Error('invalid_shape')
  }

  if (!isIsoDate(parsed.exportedAt)) {
    throw new Error('invalid_shape')
  }

  const items = parsed.items.filter(isFreezerItemRecord)

  const ids = new Set(items.map((item) => item.id))

  if (
    typeof parsed.itemCount !== 'number' ||
    items.length !== parsed.items.length ||
    ids.size !== items.length ||
    parsed.itemCount !== items.length
  ) {
    throw new Error('invalid_items')
  }

  return {
    version: 1,
    exportedAt: parsed.exportedAt,
    itemCount: items.length,
    items,
  }
}

export async function importBackupPayload(
  payload: BackupPayload,
): Promise<number> {
  await db.transaction('rw', db.freezerItems, async () => {
    await db.freezerItems.clear()
    await db.freezerItems.bulkPut(payload.items)
  })

  return payload.items.length
}
