import type { Product, FilterState } from '../types';
import ProductGrid from './ProductGrid';
import './ShopPage.scss';

interface Props {
  products: Product[];
  loading: boolean;
  type: FilterState['type'];
  minPrice: number;
  maxPrice: number;
  onOpenProduct: (product: Product) => void;
}

export default function ShopPage({ products, loading, type, minPrice, maxPrice, onOpenProduct }: Props) {
  const gridFilters: FilterState = { type, minPrice, maxPrice, search: '' };

  return (
    <div className="shop-page">
      <section className="shop-page__section">
        <ProductGrid products={products} filters={gridFilters} loading={loading} onOpenProduct={onOpenProduct} />
      </section>
    </div>
  );
}
