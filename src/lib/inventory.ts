import type { FreezerItemRecord, InventoryStatus } from './db'

export type InventoryMode = 'current' | 'history'
export type SortOption = 'newest' | 'oldest' | 'category'

interface FilterAndSortOptions {
  mode: InventoryMode
  category: string | 'all'
  query: string
  sort: SortOption
  labelFor: (key: string) => string
  quantityLabelFor: (item: FreezerItemRecord) => string
}

export function filterAndSortInventory(
  items: FreezerItemRecord[],
  options: FilterAndSortOptions,
): FreezerItemRecord[] {
  const query = options.query.trim().toLocaleLowerCase()
  const visibleStatus: InventoryStatus =
    options.mode === 'current' ? 'in_freezer' : 'taken_out'

  return items
    .filter((item) => {
      if (item.status !== visibleStatus) {
        return false
      }

      if (options.category !== 'all' && item.categoryKey !== options.category) {
        return false
      }

      const haystack = [
        options.labelFor(`catalog.categories.${item.categoryKey}`),
        options.labelFor(`catalog.cuts.${item.categoryKey}.${item.cutKey}`),
        options.quantityLabelFor(item),
        item.notes,
      ]
        .join(' ')
        .toLocaleLowerCase()

      return !query || haystack.includes(query)
    })
    .sort((left, right) => {
      if (options.sort === 'oldest') {
        return left.createdAt.localeCompare(right.createdAt)
      }

      if (options.sort === 'category') {
        const categoryCompare = options
          .labelFor(`catalog.categories.${left.categoryKey}`)
          .localeCompare(
            options.labelFor(`catalog.categories.${right.categoryKey}`),
          )

        if (categoryCompare !== 0) {
          return categoryCompare
        }

        return options
          .labelFor(`catalog.cuts.${left.categoryKey}.${left.cutKey}`)
          .localeCompare(
            options.labelFor(`catalog.cuts.${right.categoryKey}.${right.cutKey}`),
          )
      }

      return right.createdAt.localeCompare(left.createdAt)
    })
}
