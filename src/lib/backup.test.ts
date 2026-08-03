import { describe, expect, it } from 'vitest';
import { parseBackupPayload } from './backup';

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
};

function backup(items: unknown[], itemCount = items.length) {
  return JSON.stringify({
    version: 1,
    exportedAt: '2026-08-03T10:00:00.000Z',
    itemCount,
    items,
  });
}

const validPreset = {
  id: 'preset-1',
  categoryKey: 'chicken',
  cutKey: 'breast',
  quantityType: 'weight',
  quantityValue: 500,
  quantityUnit: 'g',
  label: '',
  lastUsedAt: null,
  useCount: 0,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

function backupV2(
  items: unknown[],
  presets: unknown[],
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify({
    version: 2,
    exportedAt: '2026-08-03T10:00:00.000Z',
    itemCount: items.length,
    items,
    presetCount: presets.length,
    presets,
    ...overrides,
  });
}

describe('parseBackupPayload', () => {
  it('rejects malformed item counts', () => {
    expect(() => parseBackupPayload(backup([validItem], 2))).toThrow(
      'invalid_items',
    );
  });

  it('rejects duplicate item IDs instead of overwriting on import', () => {
    expect(() => parseBackupPayload(backup([validItem, validItem]))).toThrow(
      'invalid_items',
    );
  });

  it('accepts a valid payload without mutating storage', () => {
    expect(parseBackupPayload(backup([validItem]))).toMatchObject({
      itemCount: 1,
      items: [validItem],
    });
  });

  it('imports v1 item-only backups with an empty preset collection', () => {
    expect(parseBackupPayload(backup([validItem]))).toMatchObject({
      version: 2,
      presetCount: 0,
      presets: [],
      items: [validItem],
    });
  });

  it('accepts v2 backups with presets', () => {
    expect(
      parseBackupPayload(backupV2([validItem], [validPreset])),
    ).toMatchObject({
      version: 2,
      presetCount: 1,
      presets: [validPreset],
    });
  });

  it('rejects duplicate preset combinations', () => {
    expect(() =>
      parseBackupPayload(
        backupV2(
          [validItem],
          [validPreset, { ...validPreset, id: 'preset-2' }],
        ),
      ),
    ).toThrow('invalid_presets');
  });
});
