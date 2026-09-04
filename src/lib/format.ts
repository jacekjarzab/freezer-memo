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

export function formatFrozenAge(date: string, language: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000))
  if (language === 'pl') return `Zamrożone ${days} dni temu`
  return `Frozen ${days} ${days === 1 ? 'day' : 'days'} ago`
}
