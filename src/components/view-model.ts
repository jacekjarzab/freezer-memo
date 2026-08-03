import type { CategoryKey } from '../data/catalog';
import type { QuantityType } from '../lib/db';

export type AddStep =
  | 'category'
  | 'cut'
  | 'quantityType'
  | 'quantityValue'
  | 'notes';
export type AddScreen = AddStep | 'done';

export interface AddDraft {
  categoryKey: CategoryKey;
  cutKey: string;
  quantityType: QuantityType;
  quantityValue: string;
  quantityUnit: string;
  notes: string;
}
