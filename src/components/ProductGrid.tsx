import type { Product, FilterState } from '../types';
import { useLang } from '../contexts/LangContext';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
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

  const filtered = products.filter((product) => {
    if (filters.type !== 'all' && product.type !== filters.type) {
      return false;
    }

    const price = product.discount && product.discount > 0
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price;

    if (filters.minPrice > 0 && price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice > 0 && price > filters.maxPrice) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const name = (product.name || '').toLowerCase();
      const desc = (product.description || '').toLowerCase();
      if (!name.includes(searchLower) && !desc.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

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
