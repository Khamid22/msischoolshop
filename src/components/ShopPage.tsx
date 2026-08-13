import type { Product, FilterState } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import ProductGrid from './ProductGrid';
import Coin from './Coin';
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
  const { t } = useLang();
  const { user } = useAuth();

  const gridFilters: FilterState = { type, minPrice, maxPrice, search: '' };

  return (
    <div className={`shop-page${user ? '' : ' shop-page--full'}`}>
      {user ? (
        <div className="shop-page__balance">
          <span className="shop-page__balance-label">{t('balanceTitle')}</span>
          <span className="shop-page__balance-value">
            <Coin className="shop-page__balance-coin" />
            {formatCoins(user.balance)}
          </span>
          {user.discount ? (
            <span className="tag tag-accent shop-page__balance-discount">−{user.discount}%</span>
          ) : null}
        </div>
      ) : null}

      <section className="shop-page__section">
        <ProductGrid products={products} filters={gridFilters} loading={loading} onOpenProduct={onOpenProduct} />
      </section>
    </div>
  );
}
