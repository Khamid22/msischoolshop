import type { Product } from '../types';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import './ProductRow.scss';

interface Props {
  products: Product[];
  loading: boolean;
  onOpenProduct: (product: Product) => void;
}

export default function ProductRow({ products, loading, onOpenProduct }: Props) {
  if (loading) {
    return (
      <div className="prow">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="prow__skeleton" key={i}>
            <SkeletonCard />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="prow">
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          onOpen={onOpenProduct}
          enterDelay={Math.min(i * 45, 360)}
        />
      ))}
    </div>
  );
}
