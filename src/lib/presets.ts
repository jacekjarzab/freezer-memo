import type { FreezerItemRecord, PresetRecord } from './db';

export type PresetSource = Pick<
  FreezerItemRecord,
  'categoryKey' | 'cutKey' | 'quantityType' | 'quantityValue' | 'quantityUnit'
>;

export function presetCombinationKey(source: PresetSource): string {
  return [
    source.categoryKey,
    source.cutKey,
    source.quantityType,
    source.quantityValue,
    source.quantityUnit,
  ].join(':');
}

export function hasDuplicatePresetCombination(
  presets: PresetRecord[],
  candidate: PresetSource,
): boolean {
  const candidateKey = presetCombinationKey(candidate);
  return presets.some(
    (preset) => presetCombinationKey(preset) === candidateKey,
  );
}

export function sortPresets(presets: PresetRecord[]): PresetRecord[] {
  return [...presets].sort((left, right) => {
    const leftTime = left.lastUsedAt ?? left.createdAt;
    const rightTime = right.lastUsedAt ?? right.createdAt;
    return rightTime.localeCompare(leftTime);
  });
}

export function presetToDraft(preset: PresetRecord) {
  return {
    categoryKey: preset.categoryKey,
    cutKey: preset.cutKey,
    freezerKey: 'home' as const,
    quantityType: preset.quantityType,
    quantityValue: String(preset.quantityValue),
    quantityUnit: preset.quantityUnit,
    notes: '',
  };
}
