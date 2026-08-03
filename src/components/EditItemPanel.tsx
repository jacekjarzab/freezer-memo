import type { TFunction } from 'i18next';
import { CATEGORY_KEYS, type CategoryKey } from '../data/catalog';
import type { FreezerItemRecord, QuantityType } from '../lib/db';
import { formatQuantity } from '../lib/format';
import type { AddDraft } from './view-model';

interface EditItemPanelProps {
  item: FreezerItemRecord;
  draft: AddDraft;
  currentCuts: string[];
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
  return (
    <section className="panel edit-panel">
      <div className="panel-heading edit-header">
        <div>
          <p className="eyebrow">{t('edit.eyebrow')}</p>
          <h2>{t('edit.title')}</h2>
        </div>
        <p className="panel-copy">{t('edit.subtitle')}</p>
      </div>
      <div className="edit-grid">
        <div className="field-group">
          <label htmlFor="edit-category">{t('fields.category')}</label>
          <select
            id="edit-category"
            value={draft.categoryKey}
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
            value={draft.quantityValue}
            onChange={(event) => update({ quantityValue: event.target.value })}
          />
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
            <input
              id="edit-quantity-unit"
              value={draft.quantityUnit}
              onChange={(event) => update({ quantityUnit: event.target.value })}
            />
          )}
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
          {t(`catalog.categories.${draft.categoryKey}`)} ·{' '}
          {t(`catalog.cuts.${draft.categoryKey}.${draft.cutKey}`)}
        </strong>
        <p>
          {formatQuantity(
            {
              ...item,
              categoryKey: draft.categoryKey,
              cutKey: draft.cutKey,
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
