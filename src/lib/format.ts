import type { TFunction } from 'i18next'
import type { FreezerItemRecord } from './db'

export function formatQuantity(item: FreezerItemRecord, t: TFunction) {
  const normalizedValue = Number.isInteger(item.quantityValue)
    ? String(item.quantityValue)
    : item.quantityValue.toFixed(1)

  if (item.quantityType === 'weight') {
    return `${normalizedValue} ${item.quantityUnit}`
  }

  return t(`quantities.compact.${item.quantityType}`, {
    count: item.quantityValue,
    value: normalizedValue,
  })
}

export function formatFrozenDate(date: string, language: string) {
  const formatter = new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return formatter.format(new Date(date))
}
