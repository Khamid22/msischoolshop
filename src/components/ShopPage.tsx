import type { Product, FilterState, Banner as BannerType } from '../types';
import { useLang } from '../contexts/LangContext';
import Banner from './Banner';
import ProductGrid from './ProductGrid';
import './ShopPage.scss';

const NO_FILTERS: FilterState = { type: 'all', minPrice: 0, maxPrice: 0, search: '' };

interface Props {
  products: Product[];
  loading: boolean;
  onOpenProduct: (product: Product) => void;
  onBannerClick: (banner: BannerType) => void;
  onOpenCatalog: () => void;
}

export default function ShopPage({ products, loading, onOpenProduct, onBannerClick, onOpenCatalog }: Props) {
  const { t } = useLang();
  const featured = products.slice(0, 8);

  return (
    <div className="shop-page">
      <Banner onBannerClick={onBannerClick} />
      <section className="shop-page__section">
        <div className="shop-page__head">
          <h2 className="shop-page__title">{t('recommended')}</h2>
          <button className="shop-page__cta" onClick={onOpenCatalog}>
            {t('goToCatalog')} →
          </button>
        </div>
        <ProductGrid products={featured} filters={NO_FILTERS} loading={loading} onOpenProduct={onOpenProduct} />
      </section>
    </div>
  );
}
