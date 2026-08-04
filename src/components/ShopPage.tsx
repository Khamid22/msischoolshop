import type { Product, Banner as BannerType } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import Banner from './Banner';
import ProductRow from './ProductRow';
import Coin from './Coin';
import './ShopPage.scss';

interface Props {
  products: Product[];
  loading: boolean;
  onOpenProduct: (product: Product) => void;
  onBannerClick: (banner: BannerType) => void;
  onOpenCatalog: () => void;
}

export default function ShopPage({ products, loading, onOpenProduct, onBannerClick, onOpenCatalog }: Props) {
  const { t } = useLang();
  const { user, openAuth } = useAuth();

  const arrivals = products;
  const digital = products.filter((p) => p.type === 'digital').slice(0, 6);

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

      <Banner onBannerClick={onBannerClick} />

      <section className="shop-page__section">
        <div className="shop-page__head">
          <h2 className="shop-page__title">{t('newArrivals')}</h2>
          <button className="btn btn-ghost shop-page__cta" onClick={onOpenCatalog}>
            {t('viewAll')} →
          </button>
        </div>
        <ProductRow products={arrivals} loading={loading} onOpenProduct={onOpenProduct} />
      </section>

      <section className="shop-page__section">
        <div className="shop-page__head">
          <h2 className="shop-page__title">{t('digitalGoods')}</h2>
          <button className="btn btn-ghost shop-page__cta" onClick={onOpenCatalog}>
            {t('viewAll')} →
          </button>
        </div>
        <ProductRow products={digital} loading={loading} onOpenProduct={onOpenProduct} />
      </section>
    </div>
  );
}
