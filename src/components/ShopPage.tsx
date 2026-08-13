import { useMemo } from 'react';
import type { Banner as BannerType, Product, ProductCollection } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import Banner from './Banner';
import Coin from './Coin';
import './ShopPage.scss';

interface Props {
  products: Product[];
  loading: boolean;
  onOpenProduct: (product: Product) => void;
  onBrowseCollection: (collection: ProductCollection) => void;
  onBannerClick: (banner: BannerType) => void;
}

const HOME_CATEGORIES: Array<{ value: ProductCollection; key: string }> = [
  { value: 'all', key: 'filterAll' },
  { value: 'study', key: 'categoryStudy' },
  { value: 'merch', key: 'categoryMerch' },
  { value: 'digital', key: 'categoryDigital' },
  { value: 'rewards', key: 'categoryRewards' },
];

const STUDENT_PICK_IDS = [
  'student-sticker-pack',
  'student-keychain',
  'student-phone-grip',
  'student-notebook-set',
  'msi-bottle',
  'msi-tote',
  'tshirt-1',
  'msi-hoodie',
];

export default function ShopPage({ products, loading, onOpenProduct, onBrowseCollection, onBannerClick }: Props) {
  const { t } = useLang();
  const { user, openAuth } = useAuth();
  const studentPicks = useMemo(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));
    return STUDENT_PICK_IDS.flatMap((id) => {
      const product = productsById.get(id);
      return product ? [product] : [];
    });
  }, [products]);
  return (
    <div className="shop-page">
      <section className="shop-balance" aria-label={t('yourBalance')}>
        <div>
          <span className="shop-balance__label">{t('yourBalance')}</span>
          {user ? (
            <strong className="shop-balance__value"><Coin /> {formatCoins(user.balance)}</strong>
          ) : (
            <strong className="shop-balance__guest">MSI Coin</strong>
          )}
        </div>
        <button className="btn btn-ghost shop-balance__earn" type="button" onClick={user ? undefined : openAuth}>
          {user ? t('howToEarn') : t('login')} <span aria-hidden="true">↗</span>
        </button>
      </section>

      <section className="shop-page__banner" aria-label={t('featuredDrops')}>
        <Banner onBannerClick={onBannerClick} />
      </section>

      <nav className="home-categories" aria-label={t('categories')}>
        {HOME_CATEGORIES.map((category, index) => (
          <button
            className={index === 0 ? 'home-categories__item home-categories__item--active' : 'home-categories__item'}
            key={category.value}
            type="button"
            onClick={() => onBrowseCollection(category.value)}
          >
            {t(category.key)}
          </button>
        ))}
      </nav>

      <section className="mini-section" aria-labelledby="student-picks-heading">
        <div className="mini-section__head">
          <h2 id="student-picks-heading">{t('studentPicks')}</h2>
          <button type="button" onClick={() => onBrowseCollection('merch')}>{t('viewAll')}</button>
        </div>
        <div className="mini-products">
          {loading
            ? Array.from({ length: 8 }, (_, index) => <SkeletonCard key={index} />)
            : studentPicks.map((product, index) => (
              <ProductCard key={product.id} product={product} onOpen={onOpenProduct} enterDelay={index * 45} />
            ))}
        </div>
      </section>

    </div>
  );
}
