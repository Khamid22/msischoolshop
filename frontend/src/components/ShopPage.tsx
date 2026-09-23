import { useEffect, useState } from 'react';
import type { Banner as BannerType, CatalogCategory, Product, ProductCollection } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import { fetchStudentPicks } from '../api';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import Banner from './Banner';
import Coin from './Coin';
import './ShopPage.scss';

interface Props {
  categories: CatalogCategory[];
  onOpenProduct: (product: Product) => void;
  onBrowseCollection: (collection: ProductCollection) => void;
  onBannerClick: (banner: BannerType) => void;
}

export default function ShopPage({ categories, onOpenProduct, onBrowseCollection, onBannerClick }: Props) {
  const { lang, t } = useLang();
  const { user, openAuth } = useAuth();
  const [studentPicks, setStudentPicks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudentPicks(controller.signal)
      .then((products) => {
        if (!controller.signal.aborted) setStudentPicks(products);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setFailed(false);
    setLoading(true);
    setAttempt((current) => current + 1);
  }
  const homeCategories = [
    { value: 'all', label: t('filterAll') },
    ...categories.map((category) => ({
      value: category.id,
      label: lang === 'uz' ? category.nameUz : lang === 'en' ? category.nameEn : category.nameRu,
    })),
  ];
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
          {user ? t('howToEarn') : t('studentAccess')} <span aria-hidden="true">↗</span>
        </button>
      </section>

      <section className="shop-page__banner" aria-label={t('featuredDrops')}>
        <Banner onBannerClick={onBannerClick} />
      </section>

      <nav className="home-categories" aria-label={t('categories')}>
        {homeCategories.map((category, index) => (
          <button
            className={index === 0 ? 'home-categories__item home-categories__item--active' : 'home-categories__item'}
            key={category.value}
            type="button"
            onClick={() => onBrowseCollection(category.value)}
          >
            {category.label}
          </button>
        ))}
      </nav>

      <section className="mini-section" aria-labelledby="student-picks-heading">
        <div className="mini-section__head">
          <h2 id="student-picks-heading">{t('studentPicks')}</h2>
          <button type="button" onClick={() => onBrowseCollection('all')}>{t('viewAll')}</button>
        </div>
        {failed ? (
          <div className="mini-section__message" role="alert">
            <p>{t('studentPicksError')}</p>
            <button type="button" className="btn btn-ghost" onClick={retry}>{t('studentPicksRetry')}</button>
          </div>
        ) : !loading && studentPicks.length === 0 ? (
          <p className="mini-section__message">{t('studentPicksEmpty')}</p>
        ) : null}
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
