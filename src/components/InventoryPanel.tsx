import type { TFunction } from 'i18next';
import { CATEGORY_KEYS } from '../data/catalog';
import type { FreezerItemRecord } from '../lib/db';
import { formatFrozenAge, formatFrozenDate, formatQuantity } from '../lib/format';
import type { InventoryMode, SortOption } from '../lib/inventory';
import { CategoryIcon } from './CategoryIcon';

interface InventoryPanelProps {
  activeCategoryFilter: string;
  filteredItems: FreezerItemRecord[];
  inventoryMode: InventoryMode;
  search: string;
  sortOption: SortOption;
  handleTakeOut: (item: FreezerItemRecord) => void;
  openEditPanel: (item: FreezerItemRecord) => void;
  setActiveCategoryFilter: (value: string) => void;
  setInventoryMode: (value: InventoryMode) => void;
  setSearch: (value: string) => void;
  setSortOption: (value: SortOption) => void;
  language: string;
  t: TFunction;
  loading: boolean;
  storageError: boolean;
  retryStorage: () => void;
  addItem: () => void;
}

export function InventoryPanel({
  activeCategoryFilter,
  filteredItems,
  inventoryMode,
  search,
  sortOption,
  handleTakeOut,
  openEditPanel,
  setActiveCategoryFilter,
  setInventoryMode,
  setSearch,
  setSortOption,
  language,
  t,
  loading,
  storageError,
  retryStorage,
  addItem,
}: InventoryPanelProps) {
  const searchPlaceholder =
    inventoryMode === 'current'
      ? t('inventory.searchPlaceholder')
      : t('history.searchPlaceholder');
  return (
    <section
      aria-labelledby={`inventory-tab-${inventoryMode}`}
      className="panel"
    >
      <div
        className="inventory-tabs"
        role="tablist"
        aria-label={t('history.modeLabel')}
      >
        <button
          aria-controls="inventory-panel-content"
          aria-selected={inventoryMode === 'current'}
          className="inventory-tab"
          id="inventory-tab-current"
          role="tab"
          tabIndex={inventoryMode === 'current' ? 0 : -1}
          type="button"
          onClick={() => setInventoryMode('current')}
        >
          <span className="inventory-tab-kicker">{t('inventory.eyebrow')}</span>
          <strong>{t('inventory.title')}</strong>
        </button>
        <button
          aria-controls="inventory-panel-content"
          aria-selected={inventoryMode === 'history'}
          className="inventory-tab"
          id="inventory-tab-history"
          role="tab"
          tabIndex={inventoryMode === 'history' ? 0 : -1}
          type="button"
          onClick={() => setInventoryMode('history')}
        >
          <span className="inventory-tab-kicker">{t('history.eyebrow')}</span>
          <strong>{t('history.title')}</strong>
        </button>
      </div>
      <div
        id="inventory-panel-content"
        aria-labelledby={`inventory-tab-${inventoryMode}`}
        className="inventory-panel-content"
        role="tabpanel"
      >
        <div className="search-row">
        <input
          aria-label={searchPlaceholder}
          className="search-input"
          placeholder={searchPlaceholder}
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
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
          >
            <option value="newest">{t(inventoryMode === 'history' ? 'filters.sortOptions.recentRemoval' : 'filters.sortOptions.newest')}</option>
            <option value="oldest">{t(inventoryMode === 'history' ? 'filters.sortOptions.oldestRemoval' : 'filters.sortOptions.oldest')}</option>
            <option value="category">
              {t('filters.sortOptions.category')}
            </option>
          </select>
        </div>
      </div>
      <div className="inventory-list">
        {loading ? (
          <div className="inventory-skeleton" aria-busy="true" aria-label={t('storage.loading')}>
            <span /><span /><span />
          </div>
        ) : storageError ? (
          <article className="empty-state" role="alert">
            <strong>{t('storage.errors.loadTitle')}</strong>
            <p>{t('storage.errors.load')}</p>
            <button className="primary-button" type="button" onClick={retryStorage}>{t('actions.retry')}</button>
          </article>
        ) : filteredItems.length === 0 ? (
          <article className="empty-state">
            <strong>
              {inventoryMode === 'history'
                ? t('history.emptyTitle')
                : search.trim()
                  ? t('inventory.noSearchResultsTitle')
                  : activeCategoryFilter !== 'all'
                    ? t('inventory.noFilterResultsTitle')
                    : t('inventory.firstUseTitle')}
            </strong>
            <p>
              {inventoryMode === 'history'
                ? t('history.emptyCopy')
                : search.trim()
                  ? t('inventory.noSearchResultsCopy', { query: search.trim() })
                  : activeCategoryFilter !== 'all'
                    ? t('inventory.noFilterResultsCopy')
                    : t('inventory.firstUseCopy')}
            </p>
            {inventoryMode === 'current' && !search.trim() && activeCategoryFilter === 'all' ? <button className="primary-button" type="button" onClick={addItem}>{t('actions.addItem')}</button> : null}
            {inventoryMode === 'current' && search.trim() ? <button className="secondary-button" type="button" onClick={() => setSearch('')}>{t('actions.clearSearch')}</button> : null}
            {inventoryMode === 'current' && !search.trim() && activeCategoryFilter !== 'all' ? <button className="secondary-button" type="button" onClick={() => setActiveCategoryFilter('all')}>{t('actions.resetFilters')}</button> : null}
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
                <span>{formatFrozenAge(item.frozenAt, language)}</span>
                <span aria-hidden="true"> · </span>
                <span>{inventoryMode === 'history' && item.takenOutAt ? `${t('history.removedOn')} ${formatFrozenDate(item.takenOutAt, language)}` : formatFrozenDate(item.frozenAt, language)}</span>
              </p>
              {item.notes ? <p className="note-line">{item.notes}</p> : null}
              <div className="inventory-card-footer">
                <div className="card-actions inventory-actions">
                  <button
                    className="secondary-button small-button"
                    type="button"
                    onClick={() => handleTakeOut(item)}
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
                <span className="freezer-badge">
                  {t(`freezers.${item.freezerKey}`)}
                </span>
              </div>
            </article>
          ))
        )}
        </div>
      </div>
    </section>
  );
}
