import { describe, expect, it } from 'vitest'
import { filterAndSortInventory } from './inventory'
import type { FreezerItemRecord } from './db'

const item = (
  overrides: Partial<FreezerItemRecord> = {},
): FreezerItemRecord => ({
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
  ...overrides,
})

const labels: Record<string, string> = {
  'catalog.categories.chicken': 'Chicken',
  'catalog.categories.beef': 'Beef',
  'catalog.cuts.chicken.breast': 'Breast',
  'catalog.cuts.beef.steak': 'Steak',
}

const options = (query: string, sort: 'newest' | 'oldest' | 'category' = 'newest') => ({
  mode: 'current' as const,
  category: 'all' as const,
  query,
  sort,
  labelFor: (key: string) => labels[key] ?? key,
  quantityLabelFor: (entry: FreezerItemRecord) =>
    `${entry.quantityValue} ${entry.quantityUnit}`,
})

describe('filterAndSortInventory', () => {
  it('searches translated labels and excludes taken-out items from current view', () => {
    const result = filterAndSortInventory(
      [item({ id: 'current' }), item({ id: 'history', status: 'taken_out' })],
      options('breast'),
    )

    expect(result.map((entry) => entry.id)).toEqual(['current'])
  })

  it('searches localized labels after the label resolver changes language', () => {
    const result = filterAndSortInventory([item()], {
      ...options('pierś'),
      labelFor: (key) =>
        key === 'catalog.cuts.chicken.breast' ? 'Pierś' : labels[key] ?? key,
    })

    expect(result).toHaveLength(1)
  })

  it('sorts by oldest deterministically', () => {
    const result = filterAndSortInventory(
      [
        item({ id: 'new', createdAt: '2026-08-02T10:00:00.000Z' }),
        item({ id: 'old', createdAt: '2026-07-01T10:00:00.000Z' }),
      ],
      options('', 'oldest'),
    )

    expect(result.map((entry) => entry.id)).toEqual(['old', 'new'])
  })

  it('uses the localized quantity label in search', () => {
    const result = filterAndSortInventory([item({ quantityType: 'packs' })], {
      ...options('paczka'),
      quantityLabelFor: () => '1 paczka',
    })

    expect(result).toHaveLength(1)
  })
})
