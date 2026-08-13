import { useMemo, useState } from 'react';
import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getProductPrice } from '../utils/currency';
import ProductRow from './ProductRow';
import Coin from './Coin';
import './ShopPage.scss';

interface Props {
  products: Product[];
  loading: boolean;
  onOpenProduct: (product: Product) => void;
}

type TypeFilter = 'all' | 'digital' | 'physical';

export default function ShopPage({ products, loading, onOpenProduct }: Props) {
  const { t } = useLang();
  const { user, openAuth } = useAuth();

  const [type, setType] = useState<TypeFilter>('all');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (type !== 'all' && p.type !== type) return false;
      const price = getProductPrice(p);
      if (minPrice > 0 && price < minPrice) return false;
      if (maxPrice > 0 && price > maxPrice) return false;
      return true;
    });
  }, [products, type, minPrice, maxPrice]);

  const typeTabs: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'digital', label: t('filterDigital') },
    { value: 'physical', label: t('filterPhysical') },
  ];

  return (
    <div className="shop-page">
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
      ) : (
        <div className="shop-page__guest">
          <span className="shop-page__guest-text">{t('shopTitle')}</span>
          <button className="btn btn-ghost shop-page__guest-btn" onClick={openAuth}>
            {t('login')} / {t('register')}
          </button>
        </div>
      )}

      <div className="shop-page__filter">
        <div className="shop-page__filter-type">
          {typeTabs.map((tab) => (
            <button
              key={tab.value}
              className={`shop-page__filter-btn ${type === tab.value ? 'shop-page__filter-btn--active' : ''}`}
              onClick={() => setType(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="shop-page__filter-price">
          <input
            className="input shop-page__filter-input"
            type="number"
            min="0"
            value={minPrice || ''}
            placeholder={t('filterMin')}
            onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
          />
          <span className="shop-page__filter-sep">—</span>
          <input
            className="input shop-page__filter-input"
            type="number"
            min="0"
            value={maxPrice || ''}
            placeholder={t('filterMax')}
            onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <section className="shop-page__section">
        {loading ? (
          <ProductRow products={[]} loading={loading} onOpenProduct={onOpenProduct} />
        ) : filtered.length === 0 ? (
          <p className="shop-page__empty">{t('noProducts')}</p>
        ) : (
          <ProductRow products={filtered} loading={false} onOpenProduct={onOpenProduct} />
        )}
      </section>
    </div>
  );
}
