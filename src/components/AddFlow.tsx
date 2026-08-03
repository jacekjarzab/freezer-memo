import type { TFunction } from 'i18next';
import { CATEGORY_KEYS, type CategoryKey } from '../data/catalog';
import { CategoryIcon } from './CategoryIcon';
import type { QuantityType, FreezerItemRecord } from '../lib/db';
import { formatQuantity } from '../lib/format';
import type { AddDraft, AddScreen, AddStep } from './view-model';

interface AddFlowProps {
  addScreen: AddScreen;
  addSteps: AddStep[];
  currentStepIndex: number;
  currentCuts: string[];
  draft: AddDraft;
  parsedQuantityValue: number;
  progressValue: number;
  quantityTypes: QuantityType[];
  weightUnits: readonly string[];
  canAdvanceFromStep: (step: AddStep) => boolean;
  closeAddFlow: () => void;
  handleAddSameAgain: () => void;
  handleBackStep: () => void;
  handleCategorySelect: (category: CategoryKey) => void;
  handleNextStep: () => void;
  handleQuantityTypeSelect: (type: QuantityType) => void;
  t: TFunction;
  updateDraft: (patch: Partial<AddDraft>) => void;
}

export function AddFlow({
  addScreen,
  addSteps,
  currentStepIndex,
  currentCuts,
  draft,
  parsedQuantityValue,
  progressValue,
  quantityTypes,
  weightUnits,
  canAdvanceFromStep,
  closeAddFlow,
  handleAddSameAgain,
  handleBackStep,
  handleCategorySelect,
  handleNextStep,
  handleQuantityTypeSelect,
  t,
  updateDraft,
}: AddFlowProps) {
  return (
    <section className="panel add-flow-panel">
      <div className="panel-heading add-flow-header">
        <div>
          <p className="eyebrow">{t('add.stepLabel')}</p>
          <h2>{t('add.title')}</h2>
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
          <div className="step-header">
            <h3>{t(`add.steps.${addScreen}.title`)}</h3>
            <p className={addScreen === 'cut' ? 'step-header-note' : undefined}>
              {t(`add.steps.${addScreen}.description`)}
            </p>
          </div>
          {addScreen === 'category' ? (
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
                    <label>{t('fields.quantityUnit')}</label>
                    <div className="pill-row">
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
                {draft.notes ? <p>{draft.notes}</p> : null}
              </article>
            </div>
          ) : null}
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
