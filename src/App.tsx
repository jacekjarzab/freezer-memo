import { useDeferredValue, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import './App.css'
import {
  CATEGORY_KEYS,
  CUT_OPTIONS_BY_CATEGORY,
  type CategoryKey,
} from './data/catalog'
import { db, type FreezerItemRecord, type QuantityType } from './lib/db'
import { formatFrozenDate, formatQuantity } from './lib/format'

type AddStep = 'category' | 'cut' | 'quantityType' | 'quantityValue' | 'notes'
type AddScreen = AddStep | 'done'

interface AddDraft {
  categoryKey: CategoryKey
  cutKey: string
  quantityType: QuantityType
  quantityValue: string
  quantityUnit: string
  notes: string
}

const addSteps: AddStep[] = [
  'category',
  'cut',
  'quantityType',
  'quantityValue',
  'notes',
]

const quantityTypes: QuantityType[] = ['weight', 'packs', 'pieces']
const weightUnits = ['g', 'kg'] as const

function createInitialDraft(): AddDraft {
  return {
    categoryKey: 'chicken',
    cutKey: 'breast',
    quantityType: 'weight',
    quantityValue: '500',
    quantityUnit: 'g',
    notes: '',
  }
}

function App() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [showTakenOut, setShowTakenOut] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addScreen, setAddScreen] = useState<AddScreen>('category')
  const [draft, setDraft] = useState<AddDraft>(createInitialDraft())
  const [lastSavedDraft, setLastSavedDraft] = useState<AddDraft | null>(null)
  const deferredSearch = useDeferredValue(search)

  const items = useLiveQuery(
    async () => db.freezerItems.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  )

  const recentItems = useMemo(() => {
    const seen = new Set<string>()

    return (items ?? [])
      .filter((item) => {
        const key = [
          item.categoryKey,
          item.cutKey,
          item.quantityType,
          item.quantityValue,
          item.quantityUnit,
        ].join(':')

        if (seen.has(key)) {
          return false
        }

        seen.add(key)
        return true
      })
      .slice(0, 4)
  }, [items])

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()

    return (items ?? []).filter((item) => {
      if (!showTakenOut && item.status === 'taken_out') {
        return false
      }

      const categoryLabel = t(`catalog.categories.${item.categoryKey}`)
      const cutLabel = t(`catalog.cuts.${item.categoryKey}.${item.cutKey}`)
      const quantityLabel = formatQuantity(item, t)
      const haystack = [categoryLabel, cutLabel, quantityLabel, item.notes]
        .join(' ')
        .toLowerCase()

      return !query || haystack.includes(query)
    })
  }, [deferredSearch, items, showTakenOut, t])

  const activeCount =
    items?.filter((item) => item.status === 'in_freezer').length ?? 0

  const countsByCategory = useMemo(
    () =>
      CATEGORY_KEYS.map((key) => ({
        key,
        count:
          items?.filter(
            (item) => item.status === 'in_freezer' && item.categoryKey === key,
          ).length ?? 0,
      })).filter((entry) => entry.count > 0),
    [items],
  )

  const currentCuts = CUT_OPTIONS_BY_CATEGORY[draft.categoryKey]
  const currentStepIndex =
    addScreen === 'done' ? addSteps.length : addSteps.indexOf(addScreen)
  const progressValue = ((currentStepIndex + 1) / (addSteps.length + 1)) * 100
  const parsedQuantityValue = Number.parseFloat(draft.quantityValue.replace(',', '.'))

  function openAddFlow(prefill?: Partial<AddDraft>, step: AddScreen = 'category') {
    setDraft({
      ...createInitialDraft(),
      ...prefill,
    })
    setAddScreen(step)
    setShowAddPanel(true)
  }

  function closeAddFlow() {
    setShowAddPanel(false)
    setAddScreen('category')
  }

  function updateDraft(patch: Partial<AddDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function updateLanguage(language: 'en' | 'pl') {
    void i18n.changeLanguage(language)
    window.localStorage.setItem('freezer-memo-language', language)
  }

  function handleCategorySelect(nextCategory: CategoryKey) {
    updateDraft({
      categoryKey: nextCategory,
      cutKey: CUT_OPTIONS_BY_CATEGORY[nextCategory][0],
    })
  }

  function handleQuantityTypeSelect(nextType: QuantityType) {
    updateDraft({
      quantityType: nextType,
      quantityUnit: nextType === 'weight' ? 'g' : nextType,
    })
  }

  function canAdvanceFromStep(step: AddStep) {
    switch (step) {
      case 'category':
        return Boolean(draft.categoryKey)
      case 'cut':
        return Boolean(draft.cutKey)
      case 'quantityType':
        return Boolean(draft.quantityType)
      case 'quantityValue':
        return Number.isFinite(parsedQuantityValue) && parsedQuantityValue > 0
      case 'notes':
        return true
      default:
        return false
    }
  }

  function handleNextStep() {
    if (addScreen === 'done') {
      closeAddFlow()
      return
    }

    if (!canAdvanceFromStep(addScreen)) {
      return
    }

    const nextIndex = addSteps.indexOf(addScreen) + 1

    if (nextIndex >= addSteps.length) {
      void handleSaveItem()
      return
    }

    setAddScreen(addSteps[nextIndex])
  }

  function handleBackStep() {
    if (addScreen === 'done') {
      if (lastSavedDraft) {
        openAddFlow(lastSavedDraft, 'notes')
      } else {
        setAddScreen('notes')
      }
      return
    }

    const previousIndex = addSteps.indexOf(addScreen) - 1

    if (previousIndex < 0) {
      closeAddFlow()
      return
    }

    setAddScreen(addSteps[previousIndex])
  }

  async function handleSaveItem() {
    if (!Number.isFinite(parsedQuantityValue) || parsedQuantityValue <= 0) {
      return
    }

    const now = new Date().toISOString()
    const normalizedDraft = {
      ...draft,
      quantityValue: draft.quantityValue.replace(',', '.'),
      notes: draft.notes.trim(),
    }

    await db.freezerItems.add({
      id: crypto.randomUUID(),
      status: 'in_freezer',
      categoryKey: normalizedDraft.categoryKey,
      cutKey: normalizedDraft.cutKey,
      quantityType: normalizedDraft.quantityType,
      quantityValue: Number.parseFloat(normalizedDraft.quantityValue),
      quantityUnit: normalizedDraft.quantityUnit,
      notes: normalizedDraft.notes,
      frozenAt: now,
      takenOutAt: null,
      createdAt: now,
      updatedAt: now,
    })

    setLastSavedDraft(normalizedDraft)
    setDraft(normalizedDraft)
    setAddScreen('done')
  }

  async function handleTakeOut(item: FreezerItemRecord) {
    await db.freezerItems.update(item.id, {
      status: item.status === 'in_freezer' ? 'taken_out' : 'in_freezer',
      takenOutAt:
        item.status === 'in_freezer' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
  }

  function applyRecent(item: FreezerItemRecord) {
    openAddFlow(
      {
        categoryKey: item.categoryKey,
        cutKey: item.cutKey,
        quantityType: item.quantityType,
        quantityValue: String(item.quantityValue),
        quantityUnit: item.quantityUnit,
        notes: item.notes,
      },
      'quantityValue',
    )
  }

  function handleAddSameAgain() {
    if (!lastSavedDraft) {
      openAddFlow()
      return
    }

    openAddFlow(lastSavedDraft, 'quantityValue')
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="hero-copy">{t('hero.subtitle')}</p>
        </div>

        <div className="hero-actions">
          <button
            className="primary-button"
            type="button"
            onClick={() => (showAddPanel ? closeAddFlow() : openAddFlow())}
          >
            {showAddPanel ? t('actions.close') : t('actions.addItem')}
          </button>

          <div className="language-switcher" aria-label={t('settings.language')}>
            <button
              className={
                i18n.language === 'en'
                  ? 'language-chip active'
                  : 'language-chip'
              }
              type="button"
              onClick={() => updateLanguage('en')}
            >
              EN
            </button>
            <button
              className={
                i18n.language === 'pl'
                  ? 'language-chip active'
                  : 'language-chip'
              }
              type="button"
              onClick={() => updateLanguage('pl')}
            >
              PL
            </button>
          </div>
        </div>
      </section>

      <section className="summary-grid" aria-label={t('summary.title')}>
        <article className="summary-card emphasis">
          <span>{t('summary.items')}</span>
          <strong>{activeCount}</strong>
        </article>
        {countsByCategory.length === 0 ? (
          <article className="summary-card">
            <span>{t('summary.emptyLabel')}</span>
            <strong>{t('summary.emptyValue')}</strong>
          </article>
        ) : (
          countsByCategory.slice(0, 3).map((entry) => (
            <article className="summary-card" key={entry.key}>
              <span>{t(`catalog.categories.${entry.key}`)}</span>
              <strong>{entry.count}</strong>
            </article>
          ))
        )}
      </section>

      {showAddPanel ? (
        <section className="panel add-flow-panel">
          <div className="panel-heading add-flow-header">
            <div>
              <p className="eyebrow">{t('add.stepLabel')}</p>
              <h2>{t('add.title')}</h2>
            </div>
            <p className="panel-copy">{t('add.subtitle')}</p>
          </div>

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
                <p>{t(`add.steps.${addScreen}.description`)}</p>
              </div>

              {addScreen === 'category' ? (
                <div className="option-grid">
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
                      <strong>{t(`catalog.categories.${key}`)}</strong>
                      <span>{t(`add.categoryHints.${key}`)}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {addScreen === 'cut' ? (
                <div className="option-grid">
                  {currentCuts.map((key) => (
                    <button
                      className={
                        draft.cutKey === key ? 'option-card active' : 'option-card'
                      }
                      key={key}
                      type="button"
                      onClick={() => updateDraft({ cutKey: key })}
                    >
                      <strong>{t(`catalog.cuts.${draft.categoryKey}.${key}`)}</strong>
                      <span>{t('add.cutHelper')}</span>
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
                    <div className="field-group">
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

                    <div className="field-group">
                      <label>{t('fields.quantityUnit')}</label>
                      {draft.quantityType === 'weight' ? (
                        <div className="pill-row">
                          {weightUnits.map((unit) => (
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
                          ))}
                        </div>
                      ) : (
                        <div className="pill-row">
                          <span className="pill-chip static">
                            {t(`quantities.types.${draft.quantityType}`)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <article className="step-preview">
                    <span>{t('add.previewLabel')}</span>
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
                      onChange={(event) => updateDraft({ notes: event.target.value })}
                    />
                  </div>

                  <article className="review-card">
                    <span>{t('add.reviewLabel')}</span>
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
                        },
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
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{t('inventory.eyebrow')}</p>
            <h2>{t('inventory.title')}</h2>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setShowTakenOut((current) => !current)}
          >
            {showTakenOut ? t('filters.hideTakenOut') : t('filters.showTakenOut')}
          </button>
        </div>

        <div className="search-row">
          <input
            aria-label={t('inventory.searchPlaceholder')}
            className="search-input"
            placeholder={t('inventory.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {recentItems.length > 0 ? (
          <div className="quick-add-section">
            <p className="section-label">{t('recent.title')}</p>
            <div className="quick-add-grid">
              {recentItems.map((item) => (
                <button
                  className="quick-add-card"
                  key={`recent-${item.id}`}
                  type="button"
                  onClick={() => applyRecent(item)}
                >
                  <strong>{t(`catalog.cuts.${item.categoryKey}.${item.cutKey}`)}</strong>
                  <span>{formatQuantity(item, t)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="inventory-list">
          {filteredItems.length === 0 ? (
            <article className="empty-state">
              <strong>{t('inventory.emptyTitle')}</strong>
              <p>{t('inventory.emptyCopy')}</p>
            </article>
          ) : (
            filteredItems.map((item) => (
              <article className="inventory-card" key={item.id}>
                <div className="inventory-main">
                  <div>
                    <p className="card-kicker">
                      {t(`catalog.categories.${item.categoryKey}`)}
                    </p>
                    <h3>{t(`catalog.cuts.${item.categoryKey}.${item.cutKey}`)}</h3>
                  </div>
                  <strong className="quantity-badge">
                    {formatQuantity(item, t)}
                  </strong>
                </div>

                <p className="meta-line">
                  {formatFrozenDate(item.frozenAt, i18n.language)}
                </p>
                {item.notes ? <p className="note-line">{item.notes}</p> : null}

                <div className="card-actions">
                  <span
                    className={
                      item.status === 'in_freezer'
                        ? 'status-pill active'
                        : 'status-pill'
                    }
                  >
                    {t(`statuses.${item.status}`)}
                  </span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void handleTakeOut(item)}
                  >
                    {item.status === 'in_freezer'
                      ? t('actions.takeOut')
                      : t('actions.restore')}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

export default App
