import type { Product, FilterState } from '../types';
import { useLang } from '../contexts/LangContext';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import { filterProducts } from '../utils/productFilters';
import './ProductGrid.scss';

interface Props {
  products: Product[];
  filters: FilterState;
  loading: boolean;
  onOpenProduct: (product: Product) => void;
}

export default function ProductGrid({ products, filters, loading, onOpenProduct }: Props) {
  const { t } = useLang();
  if (loading) {
    return (
      <section className="grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </section>
    );
  }

  const filtered = filterProducts(products, filters, t);

  return (
    <section className="grid">
      {filtered.length === 0 ? (
        <div className="grid__empty">{t('noProducts')}</div>
      ) : (
        filtered.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpen={onOpenProduct}
            enterDelay={Math.min(i * 45, 450)}
          />
        ))
      )}
    </section>
  );
}
