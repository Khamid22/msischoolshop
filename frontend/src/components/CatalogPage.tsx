import { useMemo } from 'react';
import type { Product, FilterState } from '../types';
import { useLang } from '../contexts/LangContext';
import ProductGrid from './ProductGrid';
import { SearchIcon, SlidersIcon } from './icons';
import { filterProducts } from '../utils/productFilters';
import './CatalogPage.scss';

interface Props {
  products: Product[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  loading: boolean;
  onOpenProduct: (product: Product) => void;
  onOpenSearch: () => void;
  onOpenFilters: () => void;
}

export default function CatalogPage({ products, filters, onFiltersChange, loading, onOpenProduct, onOpenSearch, onOpenFilters }: Props) {
  const { t } = useLang();

  const filteredCount = useMemo(() => filterProducts(products, filters, t).length, [products, filters, t]);

  const collectionTabs: { value: NonNullable<FilterState['collection']>; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'study', label: t('categoryStudy') },
    { value: 'merch', label: t('categoryMerch') },
    { value: 'digital', label: t('categoryDigital') },
    { value: 'rewards', label: t('categoryRewards') },
  ];

  const hasAdvancedFilters = filters.minPrice > 0 || filters.maxPrice > 0 || filters.inStock || filters.courseLinked;

  return (
    <div className="catalog-page">
      <button className="catalog-page__search" onClick={onOpenSearch}>
        <SearchIcon className="catalog-page__search-icon" />
        <span className="catalog-page__search-text">{t('searchPlaceholder')}</span>
      </button>

      <div className="catalog-page__tabs">
        {collectionTabs.map((tab) => (
          <button
            key={tab.value}
            className={`catalog-page__tab ${(filters.collection || 'all') === tab.value ? 'catalog-page__tab--active' : ''}`}
            onClick={() => onFiltersChange({ ...filters, collection: tab.value })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="catalog-page__chips">
        <button className={`catalog-page__filters-btn ${hasAdvancedFilters ? 'catalog-page__filters-btn--active' : ''}`} onClick={onOpenFilters}>
          <SlidersIcon className="catalog-page__filters-icon" />
          {t('filters')}
        </button>
        <button className={`chip ${filters.minPrice === 0 && filters.maxPrice === 250 ? 'chip--active' : ''}`} onClick={() => onFiltersChange({ ...filters, minPrice: 0, maxPrice: 250 })}>{t('under250')}</button>
        <button className={`chip ${filters.inStock ? 'chip--active' : ''}`} onClick={() => onFiltersChange({ ...filters, inStock: !filters.inStock })}>{t('inStockOnly')}</button>
        {hasAdvancedFilters ? <button className="chip" onClick={() => onFiltersChange({ ...filters, minPrice: 0, maxPrice: 0, inStock: false, courseLinked: false })}>{t('clearFilters')} ×</button> : null}
      </div>

      <div className="catalog-page__count">
        {filteredCount} {t('filterProducts')}
      </div>

      <ProductGrid products={products} filters={filters} loading={loading} onOpenProduct={onOpenProduct} />
    </div>
  );
}
