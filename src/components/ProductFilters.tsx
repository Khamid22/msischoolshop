import { useLang } from '../contexts/LangContext';
import type { FilterState } from '../types';
import './ProductFilters.scss';

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  productCount: number;
}

export default function ProductFilters({ filters, onChange, productCount }: Props) {
  const { t } = useLang();

  const update = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <section className="filters">
      <div className="filters__search">
        <span className="filters__search-icon">⌕</span>
        <input
          className="filters__search-input"
          type="text"
          placeholder={t('filterSearch')}
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
        />
        {filters.search && (
          <button
            className="filters__search-clear"
            onClick={() => update({ search: '' })}
          >
            ✕
          </button>
        )}
      </div>

      <div className="filters__controls">
        <div className="filters__type-group">
          <button
            className={`filters__type-btn ${filters.type === 'all' ? 'filters__type-btn--active' : ''}`}
            onClick={() => update({ type: 'all' })}
          >
            {t('filterAll')}
          </button>
          <button
            className={`filters__type-btn ${filters.type === 'digital' ? 'filters__type-btn--active' : ''}`}
            onClick={() => update({ type: 'digital' })}
          >
            {t('filterDigital')}
          </button>
          <button
            className={`filters__type-btn ${filters.type === 'physical' ? 'filters__type-btn--active' : ''}`}
            onClick={() => update({ type: 'physical' })}
          >
            {t('filterPhysical')}
          </button>
        </div>

        <div className="filters__price-group">
          <div className="filters__price-input-wrap">
            <span className="filters__price-label">{t('filterMin')}</span>
            <input
              className="filters__price-input"
              type="number"
              min="0"
              value={filters.minPrice || ''}
              placeholder="0"
              onChange={(e) => update({ minPrice: Number(e.target.value) || 0 })}
            />
          </div>
          <span className="filters__price-sep">—</span>
          <div className="filters__price-input-wrap">
            <span className="filters__price-label">{t('filterMax')}</span>
            <input
              className="filters__price-input"
              type="number"
              min="0"
              value={filters.maxPrice || ''}
              placeholder="∞"
              onChange={(e) => update({ maxPrice: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <span className="filters__result-count">
          {productCount} {t('filterProducts')}
        </span>
      </div>
    </section>
  );
}
