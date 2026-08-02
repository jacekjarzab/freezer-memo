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

const quantityTypes: QuantityType[] = ['weight', 'packs', 'pieces']
const weightUnits = ['g', 'kg'] as const

function App() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [showTakenOut, setShowTakenOut] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [categoryKey, setCategoryKey] = useState<CategoryKey>('chicken')
  const [cutKey, setCutKey] = useState<string>('breast')
  const [quantityType, setQuantityType] = useState<QuantityType>('weight')
  const [quantityValue, setQuantityValue] = useState('500')
  const [quantityUnit, setQuantityUnit] = useState<string>('g')
  const [notes, setNotes] = useState('')
  const deferredSearch = useDeferredValue(search)

  const items = useLiveQuery(
    async () => db.freezerItems.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  )

  const recentItems = useMemo(() => {
    const seen = new Set<string>()

    return (items ?? []).filter((item) => {
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
    }).slice(0, 4)
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
      const haystack = [
        categoryLabel,
        cutLabel,
        quantityLabel,
        item.notes,
      ]
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

  const currentCuts = CUT_OPTIONS_BY_CATEGORY[categoryKey]

  async function handleSaveItem() {
    const now = new Date().toISOString()
    const parsedValue = Number.parseFloat(quantityValue.replace(',', '.'))

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return
    }

    await db.freezerItems.add({
      id: crypto.randomUUID(),
      status: 'in_freezer',
      categoryKey,
      cutKey,
      quantityType,
      quantityValue: parsedValue,
      quantityUnit,
      notes: notes.trim(),
      frozenAt: now,
      takenOutAt: null,
      createdAt: now,
      updatedAt: now,
    })

    setNotes('')
    setShowAddPanel(false)
  }

  async function handleTakeOut(item: FreezerItemRecord) {
    await db.freezerItems.update(item.id, {
      status: item.status === 'in_freezer' ? 'taken_out' : 'in_freezer',
      takenOutAt: item.status === 'in_freezer' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
  }

  function applyRecent(item: FreezerItemRecord) {
    setCategoryKey(item.categoryKey)
    setCutKey(item.cutKey)
    setQuantityType(item.quantityType)
    setQuantityValue(String(item.quantityValue))
    setQuantityUnit(item.quantityUnit)
    setNotes(item.notes)
    setShowAddPanel(true)
  }

  function updateLanguage(language: 'en' | 'pl') {
    void i18n.changeLanguage(language)
    window.localStorage.setItem('freezer-memo-language', language)
  }

  function handleQuantityTypeChange(nextType: QuantityType) {
    setQuantityType(nextType)
    setQuantityUnit(nextType === 'weight' ? 'g' : nextType === 'packs' ? 'packs' : 'pieces')
  }

  function handleCategoryChange(nextCategory: string) {
    const nextKey = nextCategory as CategoryKey
    const nextCuts = CUT_OPTIONS_BY_CATEGORY[nextKey]
    setCategoryKey(nextKey)
    setCutKey(nextCuts[0])
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
            onClick={() => setShowAddPanel((current) => !current)}
          >
            {showAddPanel ? t('actions.close') : t('actions.addItem')}
          </button>

          <div className="language-switcher" aria-label={t('settings.language')}>
            <button
              className={i18n.language === 'en' ? 'language-chip active' : 'language-chip'}
              type="button"
              onClick={() => updateLanguage('en')}
            >
              EN
            </button>
            <button
              className={i18n.language === 'pl' ? 'language-chip active' : 'language-chip'}
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
        <section className="panel add-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t('add.stepLabel')}</p>
              <h2>{t('add.title')}</h2>
            </div>
            <p className="panel-copy">{t('add.subtitle')}</p>
          </div>

          <div className="field-group">
            <label htmlFor="category">{t('fields.category')}</label>
            <select
              id="category"
              value={categoryKey}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`catalog.categories.${key}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="cut">{t('fields.cut')}</label>
            <select
              id="cut"
              value={cutKey}
              onChange={(event) => setCutKey(event.target.value)}
            >
              {currentCuts.map((key) => (
                <option key={key} value={key}>
                  {t(`catalog.cuts.${categoryKey}.${key}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="quantityType">{t('fields.quantityType')}</label>
              <select
                id="quantityType"
                value={quantityType}
                onChange={(event) =>
                  handleQuantityTypeChange(event.target.value as QuantityType)
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
              <label htmlFor="quantityValue">{t('fields.quantityValue')}</label>
              <input
                id="quantityValue"
                inputMode="decimal"
                value={quantityValue}
                onChange={(event) => setQuantityValue(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="quantityUnit">{t('fields.quantityUnit')}</label>
              {quantityType === 'weight' ? (
                <select
                  id="quantityUnit"
                  value={quantityUnit}
                  onChange={(event) => setQuantityUnit(event.target.value)}
                >
                  {weightUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="quantityUnit"
                  value={quantityUnit}
                  onChange={(event) => setQuantityUnit(event.target.value)}
                />
              )}
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="notes">{t('fields.notes')}</label>
            <input
              id="notes"
              placeholder={t('fields.notesPlaceholder')}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="panel-actions">
            <button className="secondary-button" type="button" onClick={() => setShowAddPanel(false)}>
              {t('actions.cancel')}
            </button>
            <button className="primary-button" type="button" onClick={() => void handleSaveItem()}>
              {t('actions.saveItem')}
            </button>
          </div>
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
                    <p className="card-kicker">{t(`catalog.categories.${item.categoryKey}`)}</p>
                    <h3>{t(`catalog.cuts.${item.categoryKey}.${item.cutKey}`)}</h3>
                  </div>
                  <strong className="quantity-badge">{formatQuantity(item, t)}</strong>
                </div>

                <p className="meta-line">{formatFrozenDate(item.frozenAt, i18n.language)}</p>
                {item.notes ? <p className="note-line">{item.notes}</p> : null}

                <div className="card-actions">
                  <span className={item.status === 'in_freezer' ? 'status-pill active' : 'status-pill'}>
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
