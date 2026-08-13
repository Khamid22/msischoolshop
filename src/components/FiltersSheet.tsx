import { useEffect, useState } from 'react';
import type { FilterState, ProductCollection } from '../types';
import { useLang } from '../contexts/LangContext';
import { XIcon } from './icons';
import './FiltersSheet.scss';

interface Props {
  open: boolean;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

export default function FiltersSheet({ open, filters, onApply, onClose }: Props) {
  const { t } = useLang();
  const [type, setType] = useState<FilterState['type']>(filters.type);
  const [collection, setCollection] = useState<ProductCollection>(filters.collection || 'all');
  const [minPrice, setMinPrice] = useState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice);
  const [inStock, setInStock] = useState(Boolean(filters.inStock));
  const [courseLinked, setCourseLinked] = useState(Boolean(filters.courseLinked));
  const [sort, setSort] = useState<NonNullable<FilterState['sort']>>(filters.sort || 'popular');

  useEffect(() => {
    if (open) {
      setType(filters.type);
      setCollection(filters.collection || 'all');
      setMinPrice(filters.minPrice);
      setMaxPrice(filters.maxPrice);
      setInStock(Boolean(filters.inStock));
      setCourseLinked(Boolean(filters.courseLinked));
      setSort(filters.sort || 'popular');
    }
  }, [open, filters]);

  if (!open) return null;

  const typeTabs: { value: FilterState['type']; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'digital', label: t('filterDigital') },
    { value: 'physical', label: t('filterPhysical') },
  ];
  const collections: { value: ProductCollection; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'study', label: t('categoryStudy') },
    { value: 'merch', label: t('categoryMerch') },
    { value: 'digital', label: t('categoryDigital') },
    { value: 'rewards', label: t('categoryRewards') },
  ];
  const sortOptions: { value: NonNullable<FilterState['sort']>; label: string }[] = [
    { value: 'popular', label: t('sortPopular') },
    { value: 'newest', label: t('sortNewest') },
    { value: 'price', label: t('sortPrice') },
  ];

  const handleReset = () => {
    setType('all');
    setCollection('all');
    setMinPrice(0);
    setMaxPrice(0);
    setInStock(false);
    setCourseLinked(false);
    setSort('popular');
  };

  const handleApply = () => {
    onApply({
      type,
      minPrice: Number(minPrice) || 0,
      maxPrice: Number(maxPrice) || 0,
      search: filters.search,
      collection,
      inStock,
      courseLinked,
      sort,
    });
    onClose();
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="sheet__grab" />
        <div className="sheet__header">
          <h2 className="sheet__title">{t('filters')}</h2>
          <button className="sheet__close" onClick={onClose} aria-label={t('close')}>
            <XIcon />
          </button>
        </div>

        <div className="sheet__group">
          <span className="sheet__label">{t('filterCategory')}</span>
          <div className="sheet__choices">
            {collections.map((option) => (
              <button key={option.value} className={`sheet__choice ${collection === option.value ? 'sheet__choice--active' : ''}`} type="button" onClick={() => setCollection(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__group">
          <span className="sheet__label">{t('filterProducts')}</span>
          <div className="sheet__seg">
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                className={`sheet__seg-opt ${type === tab.value ? 'sheet__seg-opt--active' : ''}`}
                onClick={() => setType(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__group">
          <span className="sheet__label">MSI Coin</span>
          <div className="sheet__range">
            <label className="sheet__field">
              <span className="sheet__field-label">{t('filterMin')}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={minPrice || ''}
                placeholder="0"
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
              />
            </label>
            <span className="sheet__range-sep">—</span>
            <label className="sheet__field">
              <span className="sheet__field-label">{t('filterMax')}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={maxPrice || ''}
                placeholder="∞"
                onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
              />
            </label>
          </div>
        </div>

        <div className="sheet__group sheet__group--rows">
          <label className="sheet__toggle-row">
            <span><strong>{t('inStockOnly')}</strong></span>
            <input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} />
          </label>
          <label className="sheet__toggle-row">
            <span><strong>{t('courseLinkedOnly')}</strong><small>{t('courseLinkedHelp')}</small></span>
            <input type="checkbox" checked={courseLinked} onChange={(event) => setCourseLinked(event.target.checked)} />
          </label>
        </div>

        <div className="sheet__group">
          <span className="sheet__label">{t('sortBy')}</span>
          <div className="sheet__sort">
            {sortOptions.map((option) => (
              <label key={option.value} className="sheet__radio">
                <span>{option.label}</span>
                <input type="radio" name="catalog-sort" value={option.value} checked={sort === option.value} onChange={() => setSort(option.value)} />
              </label>
            ))}
          </div>
        </div>

        <div className="sheet__actions">
          <button className="btn btn-secondary sheet__reset" onClick={handleReset}>
            {t('clearFilters')}
          </button>
          <button className="btn btn-primary sheet__apply" onClick={handleApply}>
            {t('showItems')}
          </button>
        </div>
      </div>
    </>
  );
}
