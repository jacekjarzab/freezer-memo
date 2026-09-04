import { useEffect, useRef } from 'react';
import type { TFunction } from 'i18next';
import { CATEGORY_KEYS, type CategoryKey } from '../data/catalog';
import type { FreezerItemRecord, FreezerKey, QuantityType } from '../lib/db';
import { formatQuantity } from '../lib/format';
import type { AddDraft } from './view-model';

interface EditItemPanelProps {
  item: FreezerItemRecord;
  draft: AddDraft;
  currentCuts: string[];
  freezerKeys: FreezerKey[];
  parsedQuantityValue: number;
  notice: string | null;
  noticeTone: 'success' | 'error';
  close: () => void;
  save: () => void;
  selectCategory: (category: CategoryKey) => void;
  selectQuantityType: (type: QuantityType) => void;
  update: (patch: Partial<AddDraft>) => void;
  t: TFunction;
}
const quantityTypes: QuantityType[] = ['weight', 'packs', 'pieces'];
const weightUnits = ['kg', 'g'] as const;

export function EditItemPanel({
  item,
  draft,
  currentCuts,
  freezerKeys,
  parsedQuantityValue,
  notice,
  noticeTone,
  close,
  save,
  selectCategory,
  selectQuantityType,
  update,
  t,
}: EditItemPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => panelRef.current?.focus(), []);
  return (
    <section className="panel edit-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="edit-panel-title" tabIndex={-1}>
      <div className="panel-heading edit-header">
        <div>
          <p className="eyebrow">{t('edit.eyebrow')}</p>
          <h2 id="edit-panel-title">{t('edit.title')}</h2>
        </div>
        <p className="panel-copy">{t('edit.subtitle')}</p>
      </div>
      <div className="edit-grid">
        <div className="field-group">
          <label htmlFor="edit-category">{t('fields.category')}</label>
          <select
            id="edit-category"
            value={draft.categoryKey ?? item.categoryKey}
            onChange={(event) =>
              selectCategory(event.target.value as CategoryKey)
            }
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`catalog.categories.${key}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="edit-cut">{t('fields.cut')}</label>
          <select
            id="edit-cut"
            value={draft.cutKey}
            onChange={(event) => update({ cutKey: event.target.value })}
          >
            {currentCuts.map((key) => (
              <option key={key} value={key}>
                {t(`catalog.cuts.${draft.categoryKey}.${key}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="edit-quantity-type">{t('fields.quantityType')}</label>
          <select
            id="edit-quantity-type"
            value={draft.quantityType}
            onChange={(event) =>
              selectQuantityType(event.target.value as QuantityType)
            }
          >
            {quantityTypes.map((type) => (
              <option key={type} value={type}>
                {t(`quantities.types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="edit-quantity-value">
            {t('fields.quantityValue')}
          </label>
          <input
            id="edit-quantity-value"
            inputMode="decimal"
            min="0.01"
            step="any"
            aria-invalid={draft.quantityValue.trim() !== '' && (!Number.isFinite(parsedQuantityValue) || parsedQuantityValue <= 0)}
            value={draft.quantityValue}
            onChange={(event) => update({ quantityValue: event.target.value })}
          />
          {draft.quantityValue.trim() !== '' && (!Number.isFinite(parsedQuantityValue) || parsedQuantityValue <= 0) ? <p className="field-error" role="alert">{t('validation.positiveQuantity')}</p> : null}
        </div>
        <div className="field-group">
          <label htmlFor="edit-quantity-unit">{t('fields.quantityUnit')}</label>
          {draft.quantityType === 'weight' ? (
            <select
              id="edit-quantity-unit"
              value={draft.quantityUnit}
              onChange={(event) => update({ quantityUnit: event.target.value })}
            >
              {weightUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          ) : (
            <span className="field-value-readonly" id="edit-quantity-unit">{t(`quantities.types.${draft.quantityType}`)}</span>
          )}
        </div>
        <div className="field-group">
          <label htmlFor="edit-freezer">{t('fields.freezer')}</label>
          <select
            id="edit-freezer"
            value={draft.freezerKey}
            onChange={(event) =>
              update({ freezerKey: event.target.value as FreezerKey })
            }
          >
            {freezerKeys.map((key) => (
              <option key={key} value={key}>
                {t(`freezers.${key}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group edit-notes">
          <label htmlFor="edit-notes">{t('fields.notes')}</label>
          <input
            id="edit-notes"
            value={draft.notes}
            placeholder={t('fields.notesPlaceholder')}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </div>
      </div>
      <article className="review-card">
        <span>{t('edit.previewLabel')} </span>
        <strong>
          {t(`catalog.categories.${draft.categoryKey ?? item.categoryKey}`)} ·{' '}
          {t(`catalog.cuts.${draft.categoryKey ?? item.categoryKey}.${draft.cutKey}`)}
        </strong>
        <p>
          {formatQuantity(
            {
              ...item,
              categoryKey: draft.categoryKey ?? item.categoryKey,
              cutKey: draft.cutKey,
              freezerKey: draft.freezerKey,
              quantityType: draft.quantityType,
              quantityValue: Number.isFinite(parsedQuantityValue)
                ? parsedQuantityValue
                : 0,
              quantityUnit: draft.quantityUnit,
              notes: draft.notes,
            },
            t,
          )}
        </p>
        <p className="review-freezer-label">
          {t('fields.freezer')}: {t(`freezers.${draft.freezerKey}`)}
        </p>
      </article>
      {notice ? (
        <p
          className={
            noticeTone === 'success'
              ? 'backup-notice success'
              : 'backup-notice error'
          }
        >
          {notice}
        </p>
      ) : null}
      <div className="panel-actions">
        <button className="secondary-button" type="button" onClick={close}>
          {t('actions.close')}
        </button>
        <button className="primary-button" type="button" onClick={save}>
          {t('actions.saveChanges')}
        </button>
      </div>
    </section>
  );
}
