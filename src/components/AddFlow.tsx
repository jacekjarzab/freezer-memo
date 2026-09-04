import type { TFunction } from 'i18next';
import { CATEGORY_KEYS, type CategoryKey } from '../data/catalog';
import { CategoryIcon } from './CategoryIcon';
import type {
  FreezerItemRecord,
  FreezerKey,
  PresetRecord,
  QuantityType,
} from '../lib/db';
import { formatQuantity } from '../lib/format';
import type { AddDraft, AddScreen, AddStep } from './view-model';

interface AddFlowProps {
  addScreen: AddScreen;
  addSteps: AddStep[];
  currentStepIndex: number;
  currentCuts: string[];
  draft: AddDraft;
  freezerKeys: FreezerKey[];
  pinnedPresets: PresetRecord[];
  parsedQuantityValue: number;
  progressValue: number;
  quantityTypes: QuantityType[];
  recentItems: FreezerItemRecord[];
  weightUnits: readonly string[];
  applyRecent: (item: FreezerItemRecord) => void;
  canAdvanceFromStep: (step: AddStep) => boolean;
  closeAddFlow: () => void;
  handleAddSameAgain: () => void;
  handleBackStep: () => void;
  handleCategorySelect: (category: CategoryKey) => void;
  handleNextStep: () => void;
  handlePinPreset: (item: FreezerItemRecord) => void;
  handleQuantityTypeSelect: (type: QuantityType) => void;
  handleUnpinPreset: (preset: PresetRecord) => void;
  handleUsePreset: (preset: PresetRecord) => void;
  t: TFunction;
  updateDraft: (patch: Partial<AddDraft>) => void;
}

export function AddFlow({
  addScreen,
  addSteps,
  currentStepIndex,
  currentCuts,
  draft,
  freezerKeys,
  pinnedPresets,
  parsedQuantityValue,
  progressValue,
  quantityTypes,
  recentItems,
  weightUnits,
  applyRecent,
  canAdvanceFromStep,
  closeAddFlow,
  handleAddSameAgain,
  handleBackStep,
  handleCategorySelect,
  handleNextStep,
  handlePinPreset,
  handleQuantityTypeSelect,
  handleUnpinPreset,
  handleUsePreset,
  t,
  updateDraft,
}: AddFlowProps) {
  return (
    <section className="panel add-flow-panel" role="dialog" aria-modal="true" aria-labelledby="add-flow-title">
      <div className="panel-heading add-flow-header">
        <div>
          <p className="eyebrow">{t('add.stepLabel')}</p>
          <h2 id="add-flow-title">{t('add.title')}</h2>
        </div>
        <button
          className="ghost-button small-button add-flow-close"
          type="button"
          onClick={closeAddFlow}
        >
          {t('actions.close')}
        </button>
      </div>
      <p className="panel-copy add-flow-subtitle">{t('add.subtitle')}</p>
      <div className="progress-wrap" aria-label={t('add.progressLabel')}>
        <div className="progress-track">
          <span
            className="progress-fill"
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <div className="progress-steps">
          {addSteps.map((step, index) => (
            <span
              className={
                index <= currentStepIndex
                  ? 'progress-dot active'
                  : 'progress-dot'
              }
              key={step}
            />
          ))}
        </div>
        <p className="step-meta">
          {addScreen === 'done'
            ? t('add.stepDone')
            : t('add.stepCounter', {
                current: currentStepIndex + 1,
                total: addSteps.length,
              })}
        </p>
      </div>

      {addScreen !== 'done' ? (
        <div className="step-shell">
          <div className="step-main">
            <div className="step-header">
              <h3>{t(`add.steps.${addScreen}.title`)}</h3>
              <p className={addScreen === 'cut' ? 'step-header-note' : undefined}>
                {t(`add.steps.${addScreen}.description`)}
              </p>
            </div>
            {addScreen === 'category' ? (
              <div className="step-content add-start-content">
                <div className="option-grid tight-option-grid">
                  {CATEGORY_KEYS.map((key) => (
                    <button
                      className={
                        draft.categoryKey === key
                          ? 'option-card active'
                          : 'option-card'
                      }
                      key={key}
                      type="button"
                      onClick={() => handleCategorySelect(key)}
                    >
                      <span className="option-card-line">
                        <CategoryIcon className="option-card-icon" category={key} />
                        <strong>{t(`catalog.categories.${key}`)}</strong>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="quick-add-section add-flow-shortcuts">
                  <p className="section-label">{t('presets.title')}</p>
                  {pinnedPresets.length === 0 ? (
                    <p className="panel-copy">{t('presets.empty')}</p>
                  ) : (
                    <div className="quick-add-grid">
                      {pinnedPresets.map((preset) => (
                        <article className="quick-add-card compact" key={preset.id}>
                          <button
                            className="quick-add-main"
                            type="button"
                            onClick={() => handleUsePreset(preset)}
                          >
                            <CategoryIcon
                              className="quick-add-icon"
                              category={preset.categoryKey}
                            />
                            <strong>
                              {preset.label ||
                                t(
                                  `catalog.cuts.${preset.categoryKey}.${preset.cutKey}`,
                                )}
                            </strong>
                            <span>
                              {formatQuantity(
                                {
                                  ...preset,
                                  status: 'in_freezer',
                                  freezerKey: 'home',
                                  notes: '',
                                  frozenAt: preset.createdAt,
                                  takenOutAt: null,
                                },
                                t,
                              )}
                            </span>
                          </button>
                          <button
                            aria-label={t('actions.unpin')}
                            className="quick-add-action"
                            title={t('actions.unpin')}
                            type="button"
                            onClick={() => handleUnpinPreset(preset)}
                          >
                            <span aria-hidden="true">♥</span>
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                {recentItems.length > 0 ? (
                  <div className="quick-add-section add-flow-shortcuts">
                    <p className="section-label">{t('recent.title')}</p>
                    <div className="quick-add-grid">
                      {recentItems.map((item) => (
                        <article
                          className="quick-add-card compact"
                          key={`recent-${item.id}`}
                        >
                          <button
                            className="quick-add-main"
                            type="button"
                            onClick={() => applyRecent(item)}
                          >
                            <CategoryIcon
                              className="quick-add-icon"
                              category={item.categoryKey}
                            />
                            <strong>
                              {t(`catalog.cuts.${item.categoryKey}.${item.cutKey}`)}
                            </strong>
                            <span>{formatQuantity(item, t)}</span>
                          </button>
                          <button
                            aria-label={t('actions.pin')}
                            className="quick-add-action"
                            title={t('actions.pin')}
                            type="button"
                            onClick={() => handlePinPreset(item)}
                          >
                            <span aria-hidden="true">♡</span>
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {addScreen === 'cut' ? (
              <div className="option-grid tight-option-grid">
                {currentCuts.map((key) => (
                  <button
                    className={
                      draft.cutKey === key ? 'option-card active' : 'option-card'
                    }
                    key={key}
                    type="button"
                    onClick={() => updateDraft({ cutKey: key })}
                  >
                    <strong>
                      {t(`catalog.cuts.${draft.categoryKey}.${key}`)}
                    </strong>
                  </button>
                ))}
              </div>
            ) : null}
            {addScreen === 'quantityType' ? (
              <div className="option-grid compact">
                {quantityTypes.map((type) => (
                  <button
                    className={
                      draft.quantityType === type
                        ? 'option-card active'
                        : 'option-card'
                    }
                    key={type}
                    type="button"
                    onClick={() => handleQuantityTypeSelect(type)}
                  >
                    <strong>{t(`quantities.types.${type}`)}</strong>
                    <span>{t(`add.quantityHints.${type}`)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {addScreen === 'quantityValue' ? (
              <div className="step-content">
                <div className="quantity-panel">
                  <div className="quantity-inline">
                    <div className="field-group quantity-amount-group">
                      <label htmlFor="quantityValue">
                        {t('fields.quantityValue')}
                      </label>
                      <input
                        id="quantityValue"
                        inputMode="decimal"
                        placeholder={t('fields.quantityPlaceholder')}
                        value={draft.quantityValue}
                        onChange={(event) =>
                          updateDraft({ quantityValue: event.target.value })
                        }
                      />
                    </div>
                    <div className="field-group quantity-unit-group">
                      <span className="field-label" id="quantity-unit-label">
                        {t('fields.quantityUnit')}
                      </span>
                      <div className="pill-row" aria-labelledby="quantity-unit-label" role="group">
                        {draft.quantityType === 'weight' ? (
                          weightUnits.map((unit) => (
                            <button
                              className={
                                draft.quantityUnit === unit
                                  ? 'pill-chip active'
                                  : 'pill-chip'
                              }
                              key={unit}
                              type="button"
                              onClick={() => updateDraft({ quantityUnit: unit })}
                            >
                              {unit}
                            </button>
                          ))
                        ) : (
                          <span className="pill-chip static">
                            {t(`quantities.types.${draft.quantityType}`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <article className="step-preview">
                  <span>{t('add.previewLabel')} </span>
                  <strong>
                    {t(`catalog.categories.${draft.categoryKey}`)} ·{' '}
                    {t(`catalog.cuts.${draft.categoryKey}.${draft.cutKey}`)}
                  </strong>
                  <p>{t('add.quantityPreviewHelp')}</p>
                </article>
              </div>
            ) : null}
            {addScreen === 'notes' ? (
              <div className="step-content">
                <div className="field-group">
                  <span className="field-label" id="freezer-label">
                    {t('fields.freezer')}
                  </span>
                  <div className="pill-row" aria-labelledby="freezer-label" role="group">
                    {freezerKeys.map((key) => (
                      <button
                        className={
                          draft.freezerKey === key
                            ? 'pill-chip active'
                            : 'pill-chip'
                        }
                        key={key}
                        type="button"
                        onClick={() => updateDraft({ freezerKey: key })}
                      >
                        {t(`freezers.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-group">
                  <label htmlFor="notes">{t('fields.notes')}</label>
                  <input
                    id="notes"
                    placeholder={t('fields.notesPlaceholder')}
                    value={draft.notes}
                    onChange={(event) =>
                      updateDraft({ notes: event.target.value })
                    }
                  />
                </div>
                <article className="review-card">
                  <span>{t('add.reviewLabel')} </span>
                  <strong>
                    {t(`catalog.categories.${draft.categoryKey}`)} ·{' '}
                    {t(`catalog.cuts.${draft.categoryKey}.${draft.cutKey}`)}
                  </strong>
                  <p>
                    {formatQuantity(
                      {
                        id: 'preview',
                        status: 'in_freezer',
                        categoryKey: draft.categoryKey,
                        cutKey: draft.cutKey,
                        freezerKey: draft.freezerKey,
                        quantityType: draft.quantityType,
                        quantityValue: Number.isFinite(parsedQuantityValue)
                          ? parsedQuantityValue
                          : 0,
                        quantityUnit: draft.quantityUnit,
                        notes: draft.notes,
                        frozenAt: new Date().toISOString(),
                        takenOutAt: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      } as FreezerItemRecord,
                      t,
                    )}
                  </p>
                  <p className="review-freezer-label">
                    {t('fields.freezer')}: {t(`freezers.${draft.freezerKey}`)}
                  </p>
                  {draft.notes ? <p>{draft.notes}</p> : null}
                </article>
              </div>
            ) : null}
          </div>
          <div className="panel-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={handleBackStep}
            >
              {currentStepIndex === 0 ? t('actions.cancel') : t('actions.back')}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!canAdvanceFromStep(addScreen)}
              onClick={handleNextStep}
            >
              {addScreen === 'notes'
                ? t('actions.saveItem')
                : t('actions.next')}
            </button>
          </div>
        </div>
      ) : (
        <div className="success-shell">
          <div className="success-badge">{t('add.successBadge')}</div>
          <h3>{t('add.successTitle')}</h3>
          <p>{t('add.successCopy')}</p>
          <div className="panel-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={closeAddFlow}
            >
              {t('actions.done')}
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={handleAddSameAgain}
            >
              {t('actions.addSameAgain')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
