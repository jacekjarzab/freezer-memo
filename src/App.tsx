import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { registerSW } from 'virtual:pwa-register'
import './App.css'
import {
  CATEGORY_KEYS,
  CUT_OPTIONS_BY_CATEGORY,
  type CategoryKey,
} from './data/catalog'
import { CategoryIcon } from './components/CategoryIcon'
import {
  createBackupPayload,
  importBackupPayload,
  parseBackupPayload,
} from './lib/backup'
import { db, type FreezerItemRecord, type QuantityType } from './lib/db'
import { formatFrozenDate, formatQuantity } from './lib/format'
import {
  filterAndSortInventory,
  type InventoryMode,
  type SortOption,
} from './lib/inventory'

type AddStep = 'category' | 'cut' | 'quantityType' | 'quantityValue' | 'notes'
type AddScreen = AddStep | 'done'
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

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
const weightUnits = ['kg', 'g'] as const
const appVersion = 'v1.1'

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

function createDraftFromItem(item: FreezerItemRecord): AddDraft {
  return {
    categoryKey: item.categoryKey,
    cutKey: item.cutKey,
    quantityType: item.quantityType,
    quantityValue: String(item.quantityValue),
    quantityUnit: item.quantityUnit,
    notes: item.notes,
  }
}

function App() {
  const { t, i18n } = useTranslation()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [inventoryMode, setInventoryMode] = useState<InventoryMode>('current')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    CategoryKey | 'all'
  >('all')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addScreen, setAddScreen] = useState<AddScreen>('category')
  const [draft, setDraft] = useState<AddDraft>(createInitialDraft())
  const [lastSavedDraft, setLastSavedDraft] = useState<AddDraft | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<AddDraft>(createInitialDraft())
  const [editNotice, setEditNotice] = useState<string | null>(null)
  const [editNoticeTone, setEditNoticeTone] = useState<'success' | 'error'>(
    'success',
  )
  const [backupNotice, setBackupNotice] = useState<string | null>(null)
  const [backupNoticeTone, setBackupNoticeTone] = useState<'success' | 'error'>(
    'success',
  )
  const [isBackupOpen, setIsBackupOpen] = useState(false)
  const [isPwaOpen, setIsPwaOpen] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installNotice, setInstallNotice] = useState<string | null>(null)
  const [isOfflineReady, setIsOfflineReady] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [operationNotice, setOperationNotice] = useState<string | null>(null)
  const [pendingUndoItemId, setPendingUndoItemId] = useState<string | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [serviceWorkerUpdater, setServiceWorkerUpdater] = useState<
    (() => Promise<void>) | null
  >(null)
  const [isStandalone, setIsStandalone] = useState(false)
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

  const filteredItems = useMemo(
    () =>
      filterAndSortInventory(items ?? [], {
        mode: inventoryMode,
        category: activeCategoryFilter,
        query: deferredSearch,
        sort: sortOption,
        labelFor: (key) => t(key),
        quantityLabelFor: (item) => formatQuantity(item, t),
      }),
    [activeCategoryFilter, deferredSearch, inventoryMode, items, sortOption, t],
  )

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
  const currentEditCuts = CUT_OPTIONS_BY_CATEGORY[editDraft.categoryKey]
  const currentStepIndex =
    addScreen === 'done' ? addSteps.length : addSteps.indexOf(addScreen)
  const progressValue = ((currentStepIndex + 1) / (addSteps.length + 1)) * 100
  const parsedQuantityValue = Number.parseFloat(draft.quantityValue.replace(',', '.'))
  const parsedEditQuantityValue = Number.parseFloat(
    editDraft.quantityValue.replace(',', '.'),
  )
  const editingItem =
    editingItemId === null
      ? null
      : (items ?? []).find((item) => item.id === editingItemId) ?? null

  const updateStandaloneState = useEffectEvent(() => {
    const matchesDisplayMode = window.matchMedia(
      '(display-mode: standalone)',
    ).matches
    const isIosStandalone =
      typeof navigator !== 'undefined' &&
      'standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

    setIsStandalone(matchesDisplayMode || isIosStandalone)
  })

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady() {
        setIsOfflineReady(true)
      },
      onNeedRefresh() {
        setUpdateAvailable(true)
        setServiceWorkerUpdater(() => updateServiceWorker)
      },
    })

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent)
      setInstallNotice(null)
    }

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null)
      setInstallNotice('installed')
      updateStandaloneState()
    }

    updateStandaloneState()
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('resize', updateStandaloneState)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('resize', updateStandaloneState)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)')

    const syncBackupState = () => {
      setIsBackupOpen(!media.matches)
    }

    syncBackupState()
    media.addEventListener('change', syncBackupState)

    return () => media.removeEventListener('change', syncBackupState)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)')

    const syncPwaState = () => {
      setIsPwaOpen(!media.matches)
    }

    syncPwaState()
    media.addEventListener('change', syncPwaState)

    return () => media.removeEventListener('change', syncPwaState)
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)')

    const syncScrollLock = () => {
      if (showAddPanel && media.matches) {
        document.body.classList.add('no-scroll')
        return
      }

      document.body.classList.remove('no-scroll')
    }

    syncScrollLock()
    media.addEventListener('change', syncScrollLock)

    return () => {
      document.body.classList.remove('no-scroll')
      media.removeEventListener('change', syncScrollLock)
    }
  }, [showAddPanel])

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    },
    [],
  )

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

  function updateEditDraft(patch: Partial<AddDraft>) {
    setEditDraft((current) => ({ ...current, ...patch }))
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
      quantityValue: '1',
      quantityUnit: nextType === 'weight' ? 'kg' : nextType,
    })
  }

  function handleEditCategorySelect(nextCategory: CategoryKey) {
    updateEditDraft({
      categoryKey: nextCategory,
      cutKey: CUT_OPTIONS_BY_CATEGORY[nextCategory][0],
    })
  }

  function handleEditQuantityTypeSelect(nextType: QuantityType) {
    updateEditDraft({
      quantityType: nextType,
      quantityValue: '1',
      quantityUnit: nextType === 'weight' ? 'kg' : nextType,
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

    try {
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
    } catch {
      setOperationNotice(t('storage.errors.save'))
      return
    }

    setLastSavedDraft(normalizedDraft)
    setDraft(normalizedDraft)
    setAddScreen('done')
  }

  async function handleTakeOut(item: FreezerItemRecord) {
    const takingOut = item.status === 'in_freezer'

    try {
      const updated = await db.freezerItems.update(item.id, {
        status: takingOut ? 'taken_out' : 'in_freezer',
        takenOutAt: takingOut ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      })

      if (!updated) {
        throw new Error('missing_item')
      }

      setOperationNotice(null)
      setPendingUndoItemId(takingOut ? item.id : null)
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
      if (takingOut) {
        undoTimerRef.current = setTimeout(() => {
          setPendingUndoItemId(null)
        }, 5000)
      }
    } catch {
      setOperationNotice(t('storage.errors.save'))
    }
  }

  async function handleUndoTakeOut() {
    if (!pendingUndoItemId) {
      return
    }

    try {
      const updated = await db.freezerItems.update(pendingUndoItemId, {
        status: 'in_freezer',
        takenOutAt: null,
        updatedAt: new Date().toISOString(),
      })

      if (!updated) {
        throw new Error('missing_item')
      }

      setPendingUndoItemId(null)
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
    } catch {
      setOperationNotice(t('storage.errors.save'))
    }
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

  function openEditPanel(item: FreezerItemRecord) {
    setEditingItemId(item.id)
    setEditDraft(createDraftFromItem(item))
    setEditNotice(null)
  }

  function closeEditPanel() {
    setEditingItemId(null)
    setEditNotice(null)
  }

  async function handleSaveEdit() {
    if (!editingItem || !Number.isFinite(parsedEditQuantityValue) || parsedEditQuantityValue <= 0) {
      setEditNoticeTone('error')
      setEditNotice(t('edit.errors.invalidQuantity'))
      return
    }

    try {
      const updated = await db.freezerItems.update(editingItem.id, {
        categoryKey: editDraft.categoryKey,
        cutKey: editDraft.cutKey,
        quantityType: editDraft.quantityType,
        quantityValue: parsedEditQuantityValue,
        quantityUnit: editDraft.quantityUnit,
        notes: editDraft.notes.trim(),
        updatedAt: new Date().toISOString(),
      })

      if (!updated) {
        throw new Error('missing_item')
      }
    } catch {
      setEditNoticeTone('error')
      setEditNotice(t('storage.errors.save'))
      return
    }

    setEditNoticeTone('success')
    setEditNotice(t('edit.saved'))
  }

  async function handleExportBackup() {
    let payload

    try {
      payload = await createBackupPayload()
    } catch {
      setBackupNoticeTone('error')
      setBackupNotice(t('storage.errors.load'))
      return
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const fileDate = new Date().toISOString().slice(0, 10)
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = objectUrl
    link.download = `freezer-memo-backup-${fileDate}.json`
    link.click()
    URL.revokeObjectURL(objectUrl)

    setBackupNoticeTone('success')
    setBackupNotice(
      t('backup.exportSuccess', {
        count: payload.itemCount,
      }),
    )
  }

  function handleImportButtonClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    try {
      const fileText = await selectedFile.text()
      const payload = parseBackupPayload(fileText)
      const shouldReplace = window.confirm(t('backup.importConfirm'))

      if (!shouldReplace) {
        return
      }

      const importedCount = await importBackupPayload(payload)

      setBackupNoticeTone('success')
      setBackupNotice(
        t('backup.importSuccess', {
          count: importedCount,
        }),
      )
    } catch (error) {
      const messageKey =
        error instanceof Error &&
        ['invalid_json', 'invalid_shape', 'invalid_items'].includes(error.message)
          ? `backup.errors.${error.message}`
          : 'backup.errors.generic'

      setBackupNoticeTone('error')
      setBackupNotice(t(messageKey))
    } finally {
      event.target.value = ''
    }
  }

  async function handleInstallApp() {
    if (!deferredInstallPrompt) {
      return
    }

    await deferredInstallPrompt.prompt()
    const { outcome } = await deferredInstallPrompt.userChoice

    if (outcome === 'accepted') {
      setInstallNotice('installed')
    }

    setDeferredInstallPrompt(null)
  }

  async function handleRefreshApp() {
    if (!serviceWorkerUpdater) {
      return
    }

    await serviceWorkerUpdater()
  }

  return (
    <main
      className={
        showAddPanel ? 'app-shell app-shell--add-open' : 'app-shell'
      }
    >
      {isOfflineReady || updateAvailable || deferredInstallPrompt || isStandalone ? (
        <section className="panel pwa-panel">
          <div className="panel-heading pwa-panel-header">
            <button
              className="pwa-toggle"
              type="button"
              aria-expanded={isPwaOpen}
              onClick={() => setIsPwaOpen((current) => !current)}
            >
              <span>
                <p className="eyebrow">{t('pwa.eyebrow')}</p>
                <h2>{t('pwa.title')}</h2>
              </span>
              <span className="pwa-toggle-icon" aria-hidden="true">
                {isPwaOpen ? '−' : '+'}
              </span>
            </button>
            <p className="panel-copy pwa-subtitle">
              {updateAvailable
                ? t('pwa.updateAvailable')
                : isStandalone
                  ? t('pwa.installedState')
                  : isOfflineReady
                    ? t('pwa.offlineReady')
                    : t('pwa.installHint')}
            </p>
          </div>

          {isPwaOpen ? (
            <>
              <div className="pwa-actions">
                {deferredInstallPrompt && !isStandalone ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void handleInstallApp()}
                  >
                    {t('pwa.installButton')}
                  </button>
                ) : null}

                {updateAvailable ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void handleRefreshApp()}
                  >
                    {t('pwa.refreshButton')}
                  </button>
                ) : null}

                {isOfflineReady ? (
                  <span className="pwa-state-pill">{t('pwa.cachedBadge')}</span>
                ) : null}
              </div>

              {installNotice === 'installed' ? (
                <p className="backup-notice success">{t('pwa.installSuccess')}</p>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      <header className="app-header panel" aria-label="Freezer Memo">
        <div className="app-brand">
          <span className="app-icon" aria-hidden="true">
            FM
          </span>

          <div className="app-brand-copy">
            <div className="app-brand-line">
              <h1 className="app-name">Freezer Memo</h1>
              <span className="app-version">{appVersion}</span>
            </div>
          </div>
        </div>

        <div className="language-switcher" aria-label={t('settings.language')}>
          <button
            className={
              i18n.language === 'en' ? 'language-chip active' : 'language-chip'
            }
            type="button"
            onClick={() => updateLanguage('en')}
          >
            EN
          </button>
          <button
            className={
              i18n.language === 'pl' ? 'language-chip active' : 'language-chip'
            }
            type="button"
            onClick={() => updateLanguage('pl')}
          >
            PL
          </button>
        </div>
      </header>

      {operationNotice ? (
        <p className="backup-notice error" role="alert">
          {operationNotice}
        </p>
      ) : null}

      {pendingUndoItemId ? (
        <div className="backup-notice success undo-notice" role="status">
          <span>{t('inventory.takeOutSaved')}</span>
          <button
            className="ghost-button small-button"
            type="button"
            onClick={() => void handleUndoTakeOut()}
          >
            {t('actions.undo')}
          </button>
        </div>
      ) : null}

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
                <p
                  className={
                    addScreen === 'cut' ? 'step-header-note' : undefined
                  }
                >
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
                      <strong>{t(`catalog.cuts.${draft.categoryKey}.${key}`)}</strong>
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
                      onChange={(event) => updateDraft({ notes: event.target.value })}
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

      <button
        className="fab-button"
        type="button"
        onClick={() => openAddFlow()}
      >
        <span className="fab-icon" aria-hidden="true">
          +
        </span>
        <span>{t('actions.addItem')}</span>
      </button>

      <section className="panel">
        <div className="panel-heading inventory-header">
          <div className="inventory-title-row">
            <div>
            <p className="eyebrow">
              {inventoryMode === 'current'
                ? t('inventory.eyebrow')
                : t('history.eyebrow')}
            </p>
            <h2>
              {inventoryMode === 'current'
                ? t('inventory.title')
                : t('history.title')}
            </h2>
            </div>
            <div className="view-switcher inventory-view-switcher" aria-label={t('history.modeLabel')}>
            <button
              className={
                inventoryMode === 'current'
                  ? 'filter-chip active'
                  : 'filter-chip'
              }
              type="button"
              onClick={() => setInventoryMode('current')}
            >
              {t('history.currentView')}
            </button>
            <button
              className={
                inventoryMode === 'history'
                  ? 'filter-chip active'
                  : 'filter-chip'
              }
              type="button"
              onClick={() => setInventoryMode('history')}
              >
                {t('history.historyView')}
              </button>
            </div>
          </div>
        </div>

        <div className="search-row">
          <input
            aria-label={
              inventoryMode === 'current'
                ? t('inventory.searchPlaceholder')
                : t('history.searchPlaceholder')
            }
            className="search-input"
            placeholder={
              inventoryMode === 'current'
                ? t('inventory.searchPlaceholder')
                : t('history.searchPlaceholder')
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="inventory-controls">
          <div className="filter-chip-row" aria-label={t('filters.category')}>
            <button
              className={
                activeCategoryFilter === 'all'
                  ? 'filter-chip active'
                  : 'filter-chip'
              }
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
            >
              {t('filters.allCategories')}
            </button>
            {CATEGORY_KEYS.map((key) => (
              <button
                className={
                  activeCategoryFilter === key
                    ? 'filter-chip active'
                    : 'filter-chip'
                }
                key={key}
                type="button"
                onClick={() => setActiveCategoryFilter(key)}
              >
                <CategoryIcon className="filter-chip-icon" category={key} />
                {t(`catalog.categories.${key}`)}
              </button>
            ))}
          </div>

          <div className="field-group sort-group">
            <label htmlFor="sort-option">{t('filters.sortBy')}</label>
            <select
              id="sort-option"
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
            >
              <option value="newest">{t('filters.sortOptions.newest')}</option>
              <option value="oldest">{t('filters.sortOptions.oldest')}</option>
              <option value="category">{t('filters.sortOptions.category')}</option>
            </select>
          </div>
        </div>

              {inventoryMode === 'current' && recentItems.length > 0 ? (
          <div className="quick-add-section">
            <p className="section-label">{t('recent.title')}</p>
            <div className="quick-add-grid">
              {recentItems.map((item) => (
                <button
                  className="quick-add-card compact"
                  key={`recent-${item.id}`}
                  type="button"
                  onClick={() => applyRecent(item)}
                >
                  <CategoryIcon
                    className="quick-add-icon"
                    category={item.categoryKey}
                  />
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
              <strong>
                {inventoryMode === 'current'
                  ? t('inventory.emptyTitle')
                  : t('history.emptyTitle')}
              </strong>
              <p>
                {inventoryMode === 'current'
                  ? t('inventory.emptyCopy')
                  : t('history.emptyCopy')}
              </p>
            </article>
          ) : (
            filteredItems.map((item) => (
              <article className="inventory-card" key={item.id}>
                <div className="inventory-main">
                  <div className="inventory-copy">
                    <div className="inventory-title-row">
                      <CategoryIcon
                        className="inventory-icon"
                        category={item.categoryKey}
                      />
                      <h3>
                        {t(`catalog.categories.${item.categoryKey}`)} |{' '}
                        {t(`catalog.cuts.${item.categoryKey}.${item.cutKey}`)}
                      </h3>
                      <strong className="quantity-badge">
                        {formatQuantity(item, t)}
                      </strong>
                    </div>
                  </div>
                </div>

                <p className="meta-line">
                  {formatFrozenDate(item.frozenAt, i18n.language)}
                </p>
                {item.notes ? <p className="note-line">{item.notes}</p> : null}

                <div className="card-actions inventory-actions">
                  <button
                    className="secondary-button small-button"
                    type="button"
                    onClick={() => void handleTakeOut(item)}
                  >
                    {item.status === 'in_freezer'
                      ? t('actions.takeOut')
                      : t('actions.restore')}
                  </button>
                  <button
                    className="ghost-button small-button"
                    type="button"
                    onClick={() => openEditPanel(item)}
                  >
                    {t('actions.edit')}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {editingItem ? (
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
                value={editDraft.categoryKey}
                onChange={(event) =>
                  handleEditCategorySelect(event.target.value as CategoryKey)
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
                value={editDraft.cutKey}
                onChange={(event) => updateEditDraft({ cutKey: event.target.value })}
              >
                {currentEditCuts.map((key) => (
                  <option key={key} value={key}>
                    {t(`catalog.cuts.${editDraft.categoryKey}.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="edit-quantity-type">{t('fields.quantityType')}</label>
              <select
                id="edit-quantity-type"
                value={editDraft.quantityType}
                onChange={(event) =>
                  handleEditQuantityTypeSelect(event.target.value as QuantityType)
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
              <label htmlFor="edit-quantity-value">{t('fields.quantityValue')}</label>
              <input
                id="edit-quantity-value"
                inputMode="decimal"
                value={editDraft.quantityValue}
                onChange={(event) =>
                  updateEditDraft({ quantityValue: event.target.value })
                }
              />
            </div>

            <div className="field-group">
              <label htmlFor="edit-quantity-unit">{t('fields.quantityUnit')}</label>
              {editDraft.quantityType === 'weight' ? (
                <select
                  id="edit-quantity-unit"
                  value={editDraft.quantityUnit}
                  onChange={(event) =>
                    updateEditDraft({ quantityUnit: event.target.value })
                  }
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
                  value={editDraft.quantityUnit}
                  onChange={(event) =>
                    updateEditDraft({ quantityUnit: event.target.value })
                  }
                />
              )}
            </div>

            <div className="field-group edit-notes">
              <label htmlFor="edit-notes">{t('fields.notes')}</label>
              <input
                id="edit-notes"
                value={editDraft.notes}
                placeholder={t('fields.notesPlaceholder')}
                onChange={(event) => updateEditDraft({ notes: event.target.value })}
              />
            </div>
          </div>

          <article className="review-card">
            <span>{t('edit.previewLabel')} </span>
            <strong>
              {t(`catalog.categories.${editDraft.categoryKey}`)} ·{' '}
              {t(`catalog.cuts.${editDraft.categoryKey}.${editDraft.cutKey}`)}
            </strong>
            <p>
              {formatQuantity(
                {
                  ...editingItem,
                  categoryKey: editDraft.categoryKey,
                  cutKey: editDraft.cutKey,
                  quantityType: editDraft.quantityType,
                  quantityValue: Number.isFinite(parsedEditQuantityValue)
                    ? parsedEditQuantityValue
                    : 0,
                  quantityUnit: editDraft.quantityUnit,
                  notes: editDraft.notes,
                },
                t,
              )}
            </p>
          </article>

          {editNotice ? (
            <p
              className={
                editNoticeTone === 'success'
                  ? 'backup-notice success'
                  : 'backup-notice error'
              }
            >
              {editNotice}
            </p>
          ) : null}

          <div className="panel-actions">
            <button className="secondary-button" type="button" onClick={closeEditPanel}>
              {t('actions.close')}
            </button>
            <button className="primary-button" type="button" onClick={() => void handleSaveEdit()}>
              {t('actions.saveChanges')}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel backup-panel">
        <div className="panel-heading backup-header">
          <button
            className="backup-toggle"
            type="button"
            aria-expanded={isBackupOpen}
            onClick={() => setIsBackupOpen((current) => !current)}
          >
            <span>
              <p className="eyebrow">{t('backup.eyebrow')}</p>
              <h3>{t('backup.title')}</h3>
            </span>
            <span className="backup-toggle-icon" aria-hidden="true">
              {isBackupOpen ? '−' : '+'}
            </span>
          </button>
          <p className="panel-copy backup-subtitle">{t('backup.subtitle')}</p>
        </div>

        {isBackupOpen ? (
          <>
            <div className="backup-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => void handleExportBackup()}
              >
                {t('backup.exportButton')}
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={handleImportButtonClick}
              >
                {t('backup.importButton')}
              </button>
              <input
                ref={importInputRef}
                accept="application/json"
                className="visually-hidden"
                type="file"
                onChange={(event) => void handleImportFile(event)}
              />
            </div>

            <article className="backup-card">
              <strong>{t('backup.replaceTitle')}</strong>
              <p>{t('backup.replaceCopy')}</p>
            </article>

            {backupNotice ? (
              <p
                className={
                  backupNoticeTone === 'success'
                    ? 'backup-notice success'
                    : 'backup-notice error'
                }
              >
                {backupNotice}
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}

export default App
