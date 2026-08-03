import { describe, expect, it } from 'vitest';
import type { PresetRecord } from './db';
import {
  hasDuplicatePresetCombination,
  presetCombinationKey,
  sortPresets,
} from './presets';

const preset = (overrides: Partial<PresetRecord> = {}): PresetRecord => ({
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
  ...overrides,
});

describe('preset helpers', () => {
  it('uses stable combination keys for duplicate protection', () => {
    expect(presetCombinationKey(preset())).toBe('chicken:breast:weight:500:g');
    expect(hasDuplicatePresetCombination([preset()], preset())).toBe(true);
    expect(
      hasDuplicatePresetCombination(
        [preset()],
        preset({ quantityValue: 1, quantityUnit: 'kg' }),
      ),
    ).toBe(false);
  });

  it('sorts recently used presets before older presets', () => {
    const sorted = sortPresets([
      preset({ id: 'old', createdAt: '2026-08-01T10:00:00.000Z' }),
      preset({
        id: 'used',
        createdAt: '2026-08-02T10:00:00.000Z',
        lastUsedAt: '2026-08-03T10:00:00.000Z',
      }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(['used', 'old']);
  });
});
