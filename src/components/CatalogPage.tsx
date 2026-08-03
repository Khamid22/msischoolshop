import { useMemo } from 'react';
import type { Product, FilterState } from '../types';
import ProductFilters from './ProductFilters';
import ProductGrid from './ProductGrid';
import { useLang } from '../contexts/LangContext';
import './ShopPage.scss';

interface Props {
  products: Product[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  loading: boolean;
  onOpenProduct: (product: Product) => void;
}

export default function CatalogPage({ products, filters, onFiltersChange, loading, onOpenProduct }: Props) {
  const { t } = useLang();
  const filteredCount = useMemo(() => {
    return products.filter((product) => {
      if (filters.type !== 'all' && product.type !== filters.type) return false;
      const price = product.discount && product.discount > 0
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;
      if (filters.minPrice > 0 && price < filters.minPrice) return false;
      if (filters.maxPrice > 0 && price > filters.maxPrice) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (product.name || '').toLowerCase();
        const desc = (product.description || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    }).length;
  }, [products, filters]);

  return (
    <div className="catalog-page">
      <div className="catalog-page__rate">
        {t('starRate')} 30 {t('currency')} = 5 000 сум
      </div>
      <ProductFilters filters={filters} onChange={onFiltersChange} productCount={filteredCount} />
      <ProductGrid products={products} filters={filters} loading={loading} onOpenProduct={onOpenProduct} />
    </div>
  );
}
