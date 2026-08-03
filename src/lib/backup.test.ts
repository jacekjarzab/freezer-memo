import { describe, expect, it } from 'vitest'
import { parseBackupPayload } from './backup'

const validItem = {
  id: 'item-1',
  status: 'in_freezer',
  categoryKey: 'chicken',
  cutKey: 'breast',
  quantityType: 'weight',
  quantityValue: 500,
  quantityUnit: 'g',
  notes: '',
  frozenAt: '2026-08-01T10:00:00.000Z',
  takenOutAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
}

function backup(items: unknown[], itemCount = items.length) {
  return JSON.stringify({
    version: 1,
    exportedAt: '2026-08-03T10:00:00.000Z',
    itemCount,
    items,
  })
}

describe('parseBackupPayload', () => {
  it('rejects malformed item counts', () => {
    expect(() => parseBackupPayload(backup([validItem], 2))).toThrow(
      'invalid_items',
    )
  })

  it('rejects duplicate item IDs instead of overwriting on import', () => {
    expect(() => parseBackupPayload(backup([validItem, validItem]))).toThrow(
      'invalid_items',
    )
  })

  it('accepts a valid payload without mutating storage', () => {
    expect(parseBackupPayload(backup([validItem]))).toMatchObject({
      itemCount: 1,
      items: [validItem],
    })
  })
})
