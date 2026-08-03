import type { Product, Banner } from '../types';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import FavoriteButton from './FavoriteButton';
import './BannerProductsModal.scss';

interface Props {
  banner: Banner | null;
  allProducts: Product[];
  onClose: () => void;
  onOpenProduct: (product: Product) => void;
}

export default function BannerProductsModal({ banner, allProducts, onClose, onOpenProduct }: Props) {
  const { t } = useLang();
  const { addItem } = useCart();
  const { user, openAuth } = useAuth();

  const handleAdd = (product: Product) => {
    if (!user) {
      openAuth();
      return;
    }
    addItem(product);
  };

  if (!banner) return null;

  const products = banner.productIds
    ? allProducts.filter((p) => banner.productIds!.includes(p.id))
    : [];

  return (
    <>
      <div className="banner-modal-overlay" onClick={onClose} />
      <div className="banner-modal">
        <div className="banner-modal__header" style={{ '--modal-accent': banner.accent } as React.CSSProperties}>
          {banner.icon && <span className="banner-modal__icon">{banner.icon}</span>}
          <div className="banner-modal__title-wrap">
            <h2 className="banner-modal__title">{banner.title || t('shopTitle')}</h2>
            {banner.subtitle && <p className="banner-modal__subtitle">{banner.subtitle}</p>}
          </div>
          <button className="banner-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="banner-modal__grid">
          {products.length === 0 ? (
            <div className="banner-modal__empty">{t('noProducts')}</div>
          ) : (
            products.map((product) => {
              const displayName = t(product.nameKey) || product.name;
              const displayDesc = t(product.descKey) || product.description;
              const hasDiscount = product.discount && product.discount > 0;
              const discountedPrice = hasDiscount
                ? Math.round(product.price * (1 - product.discount! / 100))
                : product.price;

              return (
                <article
                  key={product.id}
                  className="banner-modal__card"
                  onClick={() => onOpenProduct(product)}
                >
                  {hasDiscount && (
                    <div className="tag tag-accent banner-modal__badge">-{product.discount}%</div>
                  )}
                  <FavoriteButton product={product} />
                  <div className="banner-modal__img-wrap">
                    <img className="lighten banner-modal__img" src={product.image} alt={displayName} loading="lazy" />
                  </div>
                  <div className="banner-modal__body">
                    <h3 className="banner-modal__name">{displayName}</h3>
                    <p className="banner-modal__desc">{displayDesc}</p>
                    <div className="banner-modal__footer">
                      <div className="banner-modal__price-wrap">
                        {hasDiscount && (
                          <span className="banner-modal__price-old">{t('currency')}{product.price}</span>
                        )}
                        <span className={`banner-modal__price ${hasDiscount ? 'banner-modal__price--sale' : ''}`}>
                          {t('currency')}{discountedPrice}
                        </span>
                      </div>
                      <button
                        className="btn btn-primary banner-modal__btn"
                        onClick={(e) => { e.stopPropagation(); handleAdd(product); }}
                      >
                        {t('addToCart')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
