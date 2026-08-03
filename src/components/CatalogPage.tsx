import { useMemo } from 'react';
import type { Product, FilterState } from '../types';
import { useLang } from '../contexts/LangContext';
import ProductGrid from './ProductGrid';
import { SearchIcon, SlidersIcon } from './icons';
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

interface PriceChip {
  key: 'all' | 'under250' | 'range250_750' | 'over750';
  label: string;
  min: number;
  max: number;
}

export default function CatalogPage({ products, filters, onFiltersChange, loading, onOpenProduct, onOpenSearch, onOpenFilters }: Props) {
  const { t } = useLang();

  const chips: PriceChip[] = [
    { key: 'all', label: t('allPrices'), min: 0, max: 0 },
    { key: 'under250', label: t('under250'), min: 0, max: 250 },
    { key: 'range250_750', label: t('range250_750'), min: 250, max: 750 },
    { key: 'over750', label: t('over750'), min: 750, max: 0 },
  ];

  const activeChip = chips.find((c) => c.min === filters.minPrice && c.max === filters.maxPrice)?.key || 'all';

  const setChip = (chip: PriceChip) => {
    onFiltersChange({ ...filters, minPrice: chip.min, maxPrice: chip.max });
  };

  const filteredCount = useMemo(() => {
    return products.filter((product) => {
      if (filters.type !== 'all' && product.type !== filters.type) return false;
      const price = product.discount && product.discount > 0
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;
      if (filters.minPrice > 0 && price < filters.minPrice) return false;
      if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
      return true;
    }).length;
  }, [products, filters]);

  const typeTabs: { value: FilterState['type']; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'digital', label: t('filterDigital') },
    { value: 'physical', label: t('filterPhysical') },
  ];

  return (
    <div className="catalog-page">
      <button className="catalog-page__search" onClick={onOpenSearch}>
        <SearchIcon className="catalog-page__search-icon" />
        <span className="catalog-page__search-text">{t('searchPlaceholder')}</span>
      </button>

      <div className="catalog-page__tabs">
        {typeTabs.map((tab) => (
          <button
            key={tab.value}
            className={`catalog-page__tab ${filters.type === tab.value ? 'catalog-page__tab--active' : ''}`}
            onClick={() => onFiltersChange({ ...filters, type: tab.value })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="catalog-page__chips">
        {chips.map((chip) => (
          <button
            key={chip.key}
            className={`chip ${activeChip === chip.key ? 'chip--active' : ''}`}
            onClick={() => setChip(chip)}
          >
            {chip.label}
          </button>
        ))}
        <button className="catalog-page__filters-btn" onClick={onOpenFilters}>
          <SlidersIcon className="catalog-page__filters-icon" />
          {t('filters')}
        </button>
      </div>

      <div className="catalog-page__count">
        {filteredCount} {t('filterProducts')}
      </div>

      <ProductGrid products={products} filters={filters} loading={loading} onOpenProduct={onOpenProduct} />
    </div>
  );
}
