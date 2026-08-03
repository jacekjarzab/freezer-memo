import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { registerSW } from 'virtual:pwa-register';
import './App.css';
import {
  CATEGORY_KEYS,
  CUT_OPTIONS_BY_CATEGORY,
  type CategoryKey,
} from './data/catalog';
import { AddFlow } from './components/AddFlow';
import { BackupPanel } from './components/BackupPanel';
import { EditItemPanel } from './components/EditItemPanel';
import { InventoryPanel } from './components/InventoryPanel';
import type { AddDraft, AddScreen, AddStep } from './components/view-model';
import {
  createBackupPayload,
  importBackupPayload,
  parseBackupPayload,
} from './lib/backup';
import { db, type FreezerItemRecord, type QuantityType } from './lib/db';
import { formatQuantity } from './lib/format';
import {
  filterAndSortInventory,
  type InventoryMode,
  type SortOption,
} from './lib/inventory';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
const addSteps: AddStep[] = [
  'category',
  'cut',
  'quantityType',
  'quantityValue',
  'notes',
];
const quantityTypes: QuantityType[] = ['weight', 'packs', 'pieces'];
const weightUnits = ['kg', 'g'] as const;
const appVersion = 'v1.1';
function createInitialDraft(): AddDraft {
  return {
    categoryKey: 'chicken',
    cutKey: 'breast',
    quantityType: 'weight',
    quantityValue: '500',
    quantityUnit: 'g',
    notes: '',
  };
}
function createDraftFromItem(item: FreezerItemRecord): AddDraft {
  return {
    categoryKey: item.categoryKey,
    cutKey: item.cutKey,
    quantityType: item.quantityType,
    quantityValue: String(item.quantityValue),
    quantityUnit: item.quantityUnit,
    notes: item.notes,
  };
}

function App() {
  const { t, i18n } = useTranslation();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState('');
  const [inventoryMode, setInventoryMode] = useState<InventoryMode>('current');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    CategoryKey | 'all'
  >('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addScreen, setAddScreen] = useState<AddScreen>('category');
  const [draft, setDraft] = useState<AddDraft>(createInitialDraft());
  const [lastSavedDraft, setLastSavedDraft] = useState<AddDraft | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AddDraft>(createInitialDraft());
  const [editNotice, setEditNotice] = useState<string | null>(null);
  const [editNoticeTone, setEditNoticeTone] = useState<'success' | 'error'>(
    'success',
  );
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupNoticeTone, setBackupNoticeTone] = useState<'success' | 'error'>(
    'success',
  );
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isPwaOpen, setIsPwaOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installNotice, setInstallNotice] = useState<string | null>(null);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [operationNotice, setOperationNotice] = useState<string | null>(null);
  const [pendingUndoItemId, setPendingUndoItemId] = useState<string | null>(
    null,
  );
  const [serviceWorkerUpdater, setServiceWorkerUpdater] = useState<
    (() => Promise<void>) | null
  >(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const items = useLiveQuery(
    async () => db.freezerItems.orderBy('createdAt').reverse().toArray(),
    [],
    [],
  );
  const recentItems = useMemo(() => {
    const seen = new Set<string>();
    return (items ?? [])
      .filter((item) => {
        const key = [
          item.categoryKey,
          item.cutKey,
          item.quantityType,
          item.quantityValue,
          item.quantityUnit,
        ].join(':');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [items]);
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
  );
  const activeCount =
    items?.filter((item) => item.status === 'in_freezer').length ?? 0;
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
  );
  const currentCuts = CUT_OPTIONS_BY_CATEGORY[draft.categoryKey];
  const currentEditCuts = CUT_OPTIONS_BY_CATEGORY[editDraft.categoryKey];
  const currentStepIndex =
    addScreen === 'done' ? addSteps.length : addSteps.indexOf(addScreen);
  const progressValue = ((currentStepIndex + 1) / (addSteps.length + 1)) * 100;
  const parsedQuantityValue = Number.parseFloat(
    draft.quantityValue.replace(',', '.'),
  );
  const parsedEditQuantityValue = Number.parseFloat(
    editDraft.quantityValue.replace(',', '.'),
  );
  const editingItem =
    editingItemId === null
      ? null
      : ((items ?? []).find((item) => item.id === editingItemId) ?? null);
  const updateStandaloneState = useEffectEvent(() => {
    const display = window.matchMedia('(display-mode: standalone)').matches;
    const ios =
      typeof navigator !== 'undefined' &&
      'standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(display || ios);
  });
  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onOfflineReady: () => setIsOfflineReady(true),
      onNeedRefresh: () => {
        setUpdateAvailable(true);
        setServiceWorkerUpdater(() => update);
      },
    });
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallNotice(null);
    };
    const installed = () => {
      setDeferredInstallPrompt(null);
      setInstallNotice('installed');
      updateStandaloneState();
    };
    updateStandaloneState();
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('resize', updateStandaloneState);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('resize', updateStandaloneState);
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const sync = () => setIsBackupOpen(!media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const sync = () => setIsPwaOpen(!media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const sync = () => {
      if (showAddPanel && media.matches)
        document.body.classList.add('no-scroll');
      else document.body.classList.remove('no-scroll');
    };
    sync();
    media.addEventListener('change', sync);
    return () => {
      document.body.classList.remove('no-scroll');
      media.removeEventListener('change', sync);
    };
  }, [showAddPanel]);
  useEffect(
    () => () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    },
    [],
  );
  const updateDraft = (patch: Partial<AddDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const updateEditDraft = (patch: Partial<AddDraft>) =>
    setEditDraft((current) => ({ ...current, ...patch }));
  const openAddFlow = (
    prefill?: Partial<AddDraft>,
    step: AddScreen = 'category',
  ) => {
    setDraft({ ...createInitialDraft(), ...prefill });
    setAddScreen(step);
    setShowAddPanel(true);
  };
  const closeAddFlow = () => {
    setShowAddPanel(false);
    setAddScreen('category');
  };
  const updateLanguage = (language: 'en' | 'pl') => {
    void i18n.changeLanguage(language);
    window.localStorage.setItem('freezer-memo-language', language);
  };
  const handleCategorySelect = (categoryKey: CategoryKey) =>
    updateDraft({
      categoryKey,
      cutKey: CUT_OPTIONS_BY_CATEGORY[categoryKey][0],
    });
  const handleQuantityTypeSelect = (quantityType: QuantityType) =>
    updateDraft({
      quantityType,
      quantityValue: '1',
      quantityUnit: quantityType === 'weight' ? 'kg' : quantityType,
    });
  const handleEditCategorySelect = (categoryKey: CategoryKey) =>
    updateEditDraft({
      categoryKey,
      cutKey: CUT_OPTIONS_BY_CATEGORY[categoryKey][0],
    });
  const handleEditQuantityTypeSelect = (quantityType: QuantityType) =>
    updateEditDraft({
      quantityType,
      quantityValue: '1',
      quantityUnit: quantityType === 'weight' ? 'kg' : quantityType,
    });
  const canAdvanceFromStep = (step: AddStep) =>
    step === 'quantityValue'
      ? Number.isFinite(parsedQuantityValue) && parsedQuantityValue > 0
      : step === 'notes' ||
        Boolean(
          step === 'category'
            ? draft.categoryKey
            : step === 'cut'
              ? draft.cutKey
              : draft.quantityType,
        );
  const handleNextStep = () => {
    if (addScreen === 'done') return closeAddFlow();
    if (!canAdvanceFromStep(addScreen)) return;
    const next = addSteps.indexOf(addScreen) + 1;
    if (next >= addSteps.length) return void handleSaveItem();
    setAddScreen(addSteps[next]);
  };
  const handleBackStep = () => {
    if (addScreen === 'done')
      return lastSavedDraft
        ? openAddFlow(lastSavedDraft, 'notes')
        : setAddScreen('notes');
    const previous = addSteps.indexOf(addScreen) - 1;
    if (previous < 0) return closeAddFlow();
    setAddScreen(addSteps[previous]);
  };
  async function handleSaveItem() {
    if (!Number.isFinite(parsedQuantityValue) || parsedQuantityValue <= 0)
      return;
    const now = new Date().toISOString();
    const normalized = {
      ...draft,
      quantityValue: draft.quantityValue.replace(',', '.'),
      notes: draft.notes.trim(),
    };
    try {
      await db.freezerItems.add({
        id: crypto.randomUUID(),
        status: 'in_freezer',
        categoryKey: normalized.categoryKey,
        cutKey: normalized.cutKey,
        quantityType: normalized.quantityType,
        quantityValue: Number.parseFloat(normalized.quantityValue),
        quantityUnit: normalized.quantityUnit,
        notes: normalized.notes,
        frozenAt: now,
        takenOutAt: null,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      setOperationNotice(t('storage.errors.save'));
      return;
    }
    setLastSavedDraft(normalized);
    setDraft(normalized);
    setAddScreen('done');
  }
  async function handleTakeOut(item: FreezerItemRecord) {
    const takingOut = item.status === 'in_freezer';
    try {
      const updated = await db.freezerItems.update(item.id, {
        status: takingOut ? 'taken_out' : 'in_freezer',
        takenOutAt: takingOut ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      });
      if (!updated) throw new Error('missing_item');
      setOperationNotice(null);
      setPendingUndoItemId(takingOut ? item.id : null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (takingOut)
        undoTimerRef.current = setTimeout(
          () => setPendingUndoItemId(null),
          5000,
        );
    } catch {
      setOperationNotice(t('storage.errors.save'));
    }
  }
  async function handleUndoTakeOut() {
    if (!pendingUndoItemId) return;
    try {
      const updated = await db.freezerItems.update(pendingUndoItemId, {
        status: 'in_freezer',
        takenOutAt: null,
        updatedAt: new Date().toISOString(),
      });
      if (!updated) throw new Error('missing_item');
      setPendingUndoItemId(null);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    } catch {
      setOperationNotice(t('storage.errors.save'));
    }
  }
  const applyRecent = (item: FreezerItemRecord) =>
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
    );
  const handleAddSameAgain = () =>
    lastSavedDraft
      ? openAddFlow(lastSavedDraft, 'quantityValue')
      : openAddFlow();
  const openEditPanel = (item: FreezerItemRecord) => {
    setEditingItemId(item.id);
    setEditDraft(createDraftFromItem(item));
    setEditNotice(null);
  };
  const closeEditPanel = () => {
    setEditingItemId(null);
    setEditNotice(null);
  };
  async function handleSaveEdit() {
    if (
      !editingItem ||
      !Number.isFinite(parsedEditQuantityValue) ||
      parsedEditQuantityValue <= 0
    ) {
      setEditNoticeTone('error');
      setEditNotice(t('edit.errors.invalidQuantity'));
      return;
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
      });
      if (!updated) throw new Error('missing_item');
    } catch {
      setEditNoticeTone('error');
      setEditNotice(t('storage.errors.save'));
      return;
    }
    setEditNoticeTone('success');
    setEditNotice(t('edit.saved'));
  }
  async function handleExportBackup() {
    try {
      const payload = await createBackupPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `freezer-memo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setBackupNoticeTone('success');
      setBackupNotice(t('backup.exportSuccess', { count: payload.itemCount }));
    } catch {
      setBackupNoticeTone('error');
      setBackupNotice(t('storage.errors.load'));
    }
  }
  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = parseBackupPayload(await file.text());
      if (!window.confirm(t('backup.importConfirm'))) return;
      const count = await importBackupPayload(payload);
      setBackupNoticeTone('success');
      setBackupNotice(t('backup.importSuccess', { count }));
    } catch (error) {
      const key =
        error instanceof Error &&
        ['invalid_json', 'invalid_shape', 'invalid_items'].includes(
          error.message,
        )
          ? `backup.errors.${error.message}`
          : 'backup.errors.generic';
      setBackupNoticeTone('error');
      setBackupNotice(t(key));
    } finally {
      event.target.value = '';
    }
  }
  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    if ((await deferredInstallPrompt.userChoice).outcome === 'accepted')
      setInstallNotice('installed');
    setDeferredInstallPrompt(null);
  };
  const handleRefreshApp = async () => {
    if (serviceWorkerUpdater) await serviceWorkerUpdater();
  };

  return (
    <main
      className={showAddPanel ? 'app-shell app-shell--add-open' : 'app-shell'}
    >
      {isOfflineReady ||
      updateAvailable ||
      deferredInstallPrompt ||
      isStandalone ? (
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
                <p className="backup-notice success">
                  {t('pwa.installSuccess')}
                </p>
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
        <AddFlow
          addScreen={addScreen}
          addSteps={addSteps}
          currentStepIndex={currentStepIndex}
          currentCuts={currentCuts}
          draft={draft}
          parsedQuantityValue={parsedQuantityValue}
          progressValue={progressValue}
          quantityTypes={quantityTypes}
          weightUnits={weightUnits}
          canAdvanceFromStep={canAdvanceFromStep}
          closeAddFlow={closeAddFlow}
          handleAddSameAgain={handleAddSameAgain}
          handleBackStep={handleBackStep}
          handleCategorySelect={handleCategorySelect}
          handleNextStep={handleNextStep}
          handleQuantityTypeSelect={handleQuantityTypeSelect}
          t={t}
          updateDraft={updateDraft}
        />
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
      <InventoryPanel
        activeCategoryFilter={activeCategoryFilter}
        filteredItems={filteredItems}
        inventoryMode={inventoryMode}
        recentItems={recentItems}
        search={search}
        sortOption={sortOption}
        applyRecent={applyRecent}
        handleTakeOut={(item) => void handleTakeOut(item)}
        openEditPanel={openEditPanel}
        setActiveCategoryFilter={(value) =>
          setActiveCategoryFilter(value as CategoryKey | 'all')
        }
        setInventoryMode={setInventoryMode}
        setSearch={setSearch}
        setSortOption={setSortOption}
        language={i18n.language}
        t={t}
      />
      {editingItem ? (
        <EditItemPanel
          item={editingItem}
          draft={editDraft}
          currentCuts={currentEditCuts}
          parsedQuantityValue={parsedEditQuantityValue}
          notice={editNotice}
          noticeTone={editNoticeTone}
          close={closeEditPanel}
          save={() => void handleSaveEdit()}
          selectCategory={handleEditCategorySelect}
          selectQuantityType={handleEditQuantityTypeSelect}
          update={updateEditDraft}
          t={t}
        />
      ) : null}
      <BackupPanel
        inputRef={importInputRef}
        isOpen={isBackupOpen}
        notice={backupNotice}
        noticeTone={backupNoticeTone}
        exportBackup={() => void handleExportBackup()}
        importButton={() => importInputRef.current?.click()}
        importFile={(event) => void handleImportFile(event)}
        setIsOpen={setIsBackupOpen}
        t={t}
      />
    </main>
  );
}
export default App;
