import { CATEGORY_KEYS } from '../data/catalog';
import {
  db,
  type FreezerItemRecord,
  type FreezerKey,
  type PresetRecord,
} from './db';
import { hasDuplicatePresetCombination } from './presets';

const VALID_STATUSES = ['in_freezer', 'taken_out'] as const;
const VALID_QUANTITY_TYPES = ['weight', 'packs', 'pieces'] as const;

export interface BackupPayload {
  version: 3;
  exportedAt: string;
  itemCount: number;
  items: FreezerItemRecord[];
  presetCount: number;
  presets: PresetRecord[];
}

function isFreezerKey(value: unknown): value is FreezerKey {
  return value === 'home' || value === 'basement' || value === 'away';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isFreezerItemRecord(value: unknown): value is FreezerItemRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    VALID_STATUSES.includes(value.status as (typeof VALID_STATUSES)[number]) &&
    CATEGORY_KEYS.includes(
      value.categoryKey as (typeof CATEGORY_KEYS)[number],
    ) &&
    typeof value.cutKey === 'string' &&
    isFreezerKey(value.freezerKey) &&
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
  );
}

function isPresetRecord(value: unknown): value is PresetRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    CATEGORY_KEYS.includes(
      value.categoryKey as (typeof CATEGORY_KEYS)[number],
    ) &&
    typeof value.cutKey === 'string' &&
    VALID_QUANTITY_TYPES.includes(
      value.quantityType as (typeof VALID_QUANTITY_TYPES)[number],
    ) &&
    typeof value.quantityValue === 'number' &&
    Number.isFinite(value.quantityValue) &&
    typeof value.quantityUnit === 'string' &&
    typeof value.label === 'string' &&
    (value.lastUsedAt === null || isIsoDate(value.lastUsedAt)) &&
    typeof value.useCount === 'number' &&
    Number.isInteger(value.useCount) &&
    value.useCount >= 0 &&
    isIsoDate(value.createdAt) &&
    isIsoDate(value.updatedAt)
  );
}

function normalizeImportedItem(value: unknown): FreezerItemRecord {
  if (!isRecord(value)) {
    throw new Error('invalid_items');
  }

  const normalized: Record<string, unknown> = {
    ...value,
    freezerKey: isFreezerKey(value.freezerKey) ? value.freezerKey : 'home',
  };

  if (!isFreezerItemRecord(normalized)) {
    throw new Error('invalid_items');
  }

  return normalized;
}

function validateItems(items: unknown[]): FreezerItemRecord[] {
  const validItems = items.map(normalizeImportedItem);
  const ids = new Set(validItems.map((item) => item.id));

  if (ids.size !== validItems.length) {
    throw new Error('invalid_items');
  }

  return validItems;
}

function validatePresets(presets: unknown[]): PresetRecord[] {
  const validPresets = presets.filter(isPresetRecord);
  const ids = new Set(validPresets.map((preset) => preset.id));

  if (
    validPresets.length !== presets.length ||
    ids.size !== validPresets.length ||
    validPresets.some((preset, index) =>
      validPresets
        .slice(index + 1)
        .some((other) => hasDuplicatePresetCombination([preset], other)),
    )
  ) {
    throw new Error('invalid_presets');
  }

  return validPresets;
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const items = await db.freezerItems.toArray();
  const presets = await db.presets.toArray();

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
    presetCount: presets.length,
    presets,
  };
}

export function parseBackupPayload(rawText: string): BackupPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('invalid_json');
  }

  if (!isRecord(parsed)) {
    throw new Error('invalid_shape');
  }

  if (
    ![1, 2, 3].includes(parsed.version as number) ||
    !Array.isArray(parsed.items)
  ) {
    throw new Error('invalid_shape');
  }

  if (!isIsoDate(parsed.exportedAt)) {
    throw new Error('invalid_shape');
  }

  if (
    typeof parsed.itemCount !== 'number' ||
    parsed.itemCount !== parsed.items.length
  ) {
    throw new Error('invalid_items');
  }

  const items = validateItems(parsed.items);
  if (
    [2, 3].includes(parsed.version as number) &&
    (!Array.isArray(parsed.presets) ||
      typeof parsed.presetCount !== 'number' ||
      parsed.presetCount !== parsed.presets.length)
  ) {
    throw new Error('invalid_presets');
  }

  const rawPresets: unknown[] =
    [2, 3].includes(parsed.version as number) && Array.isArray(parsed.presets)
      ? parsed.presets
      : [];
  const presets = validatePresets(rawPresets);

  return {
    version: 3,
    exportedAt: parsed.exportedAt,
    itemCount: items.length,
    items,
    presetCount: presets.length,
    presets,
  };
}

export async function importBackupPayload(
  payload: BackupPayload,
): Promise<number> {
  await db.transaction('rw', db.freezerItems, db.presets, async () => {
    await db.freezerItems.clear();
    await db.freezerItems.bulkPut(payload.items);
    await db.presets.clear();
    await db.presets.bulkPut(payload.presets);
  });

  return payload.items.length;
}
