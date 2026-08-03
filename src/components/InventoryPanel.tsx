import type { TFunction } from 'i18next';
import { CATEGORY_KEYS } from '../data/catalog';
import type { FreezerItemRecord } from '../lib/db';
import { formatFrozenDate, formatQuantity } from '../lib/format';
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
}: InventoryPanelProps) {
  const searchPlaceholder =
    inventoryMode === 'current'
      ? t('inventory.searchPlaceholder')
      : t('history.searchPlaceholder');
  return (
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
          <div
            className="view-switcher inventory-view-switcher"
            aria-label={t('history.modeLabel')}
          >
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
            <option value="newest">{t('filters.sortOptions.newest')}</option>
            <option value="oldest">{t('filters.sortOptions.oldest')}</option>
            <option value="category">
              {t('filters.sortOptions.category')}
            </option>
          </select>
        </div>
      </div>
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
                {formatFrozenDate(item.frozenAt, language)}
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
    </section>
  );
}
