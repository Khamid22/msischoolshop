import { useMemo } from 'react';
import type { Banner as BannerType, Product, ProductCollection } from '../types';
import { useLang } from '../contexts/LangContext';
import FeaturedReward from './FeaturedReward';
import CategoryStrip from './CategoryStrip';
import RewardsShowcase from './RewardsShowcase';
import StudentRewardSummary from './StudentRewardSummary';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import Banner from './Banner';
import './ShopPage.scss';

interface Props {
  products: Product[];
  loading: boolean;
  onOpenProduct: (product: Product) => void;
  onBrowseCollection: (collection: ProductCollection) => void;
  onBannerClick: (banner: BannerType) => void;
}

const FEATURED_PRODUCT_ID = 'calc-2in1';

export default function ShopPage({ products, loading, onOpenProduct, onBrowseCollection, onBannerClick }: Props) {
  const { t } = useLang();
  const featured = products.find((product) => product.id === FEATURED_PRODUCT_ID) || products[0];
  const popular = useMemo(() => (
    [...products]
      .sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0))
      .slice(0, 6)
  ), [products]);

  return (
    <div className="shop-page">
      {loading || !featured ? <div className="featured-reward featured-reward--loading" /> : (
        <FeaturedReward product={featured} onOpen={onOpenProduct} />
      )}

      <CategoryStrip onSelect={onBrowseCollection} />

      <section className="shop-section" aria-labelledby="popular-products-title">
        <div className="shop-section__head">
          <div>
            <span className="shop-section__kicker">{t('curatedForStudents')}</span>
            <h2 className="shop-section__title" id="popular-products-title">{t('popularNow')}</h2>
          </div>
          <button className="shop-section__link" type="button" onClick={() => onBrowseCollection('all')}>
            {t('viewAll')} <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="popular-grid">
          {loading
            ? Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)
            : popular.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={onOpenProduct}
                enterDelay={Math.min(index * 55, 330)}
              />
            ))}
        </div>
      </section>

      <StudentRewardSummary products={products} />

      <RewardsShowcase
        products={products}
        onOpen={onOpenProduct}
        onViewAll={() => onBrowseCollection('all')}
      />

      <section className="shop-section shop-section--drops" aria-labelledby="featured-drops-title">
        <div className="shop-section__head">
          <div>
            <span className="shop-section__kicker">MSI Shop</span>
            <h2 className="shop-section__title" id="featured-drops-title">{t('featuredDrops')}</h2>
          </div>
        </div>
        <Banner onBannerClick={onBannerClick} />
      </section>
    </div>
  );
}
