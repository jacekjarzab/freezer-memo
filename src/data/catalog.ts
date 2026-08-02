export const CATEGORY_KEYS = [
  'chicken',
  'beef',
  'pork',
  'lamb',
  'wild_boar',
  'turkey',
  'fish',
  'duck',
  'other',
] as const

export type CategoryKey = (typeof CATEGORY_KEYS)[number]

export const CUT_OPTIONS_BY_CATEGORY: Record<CategoryKey, string[]> = {
  chicken: ['breast', 'thigh', 'wings', 'drumsticks', 'whole', 'ground', 'other'],
  beef: ['steak', 'antricot', 'ribs', 'roast', 'ground', 'burger', 'other'],
  pork: ['ribs', 'loin', 'shoulder', 'neck', 'bacon', 'sausage', 'ground', 'other'],
  lamb: ['chops', 'leg', 'shoulder', 'shank', 'ground', 'other'],
  wild_boar: ['loin', 'shoulder', 'sausage', 'stew_meat', 'ground', 'other'],
  turkey: ['breast', 'thigh', 'ground', 'whole', 'other'],
  fish: ['fillet', 'steak', 'whole', 'smoked', 'other'],
  duck: ['breast', 'legs', 'whole', 'other'],
  other: ['custom'],
}
