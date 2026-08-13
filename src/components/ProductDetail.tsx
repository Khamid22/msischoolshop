import { useEffect, useMemo } from 'react';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getProductPrice, getUnitPrice } from '../utils/currency';
import FavoriteButton from './FavoriteButton';
import Rating from './Rating';
import ProductRow from './ProductRow';
import Coin from './Coin';
import { ArrowLeftIcon } from './icons';
import type { Product } from '../types';
import './ProductDetail.scss';

interface Props {
  product: Product | null;
  allProducts: Product[];
  onClose: () => void;
  onOpenProduct: (product: Product) => void;
}

export default function ProductDetail({ product, allProducts, onClose, onOpenProduct }: Props) {
  const { t } = useLang();
  const { buyNow } = useCart();
  const { user, openAuth } = useAuth();

  const recommended = useMemo(() => {
    if (!product) return [];
    const sameType = allProducts.filter((item) => item.id !== product.id && item.type === product.type);
    const remaining = allProducts.filter((item) => item.id !== product.id && item.type !== product.type);
    return [...sameType, ...remaining].slice(0, 6);
  }, [product, allProducts]);

  useEffect(() => {
    if (!product) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const displayName = t(product.nameKey) || product.name;
  const displayDescription = t(product.descKey) || product.description;
  const productPrice = getProductPrice(product);
  const finalPrice = getUnitPrice(product, user);
  const hasProductDiscount = Boolean(product.discount && product.discount > 0);
  const hasStudentDiscount = finalPrice < productPrice;
  const savings = product.price - finalPrice;

  const handleBuy = () => {
    if (!user) {
      openAuth();
      return;
    }
    buyNow(product);
  };

  return (
    <div
      className="detail"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <section
        className="detail__card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail__top">
          <button className="detail__back" type="button" onClick={onClose} aria-label={t('close')}>
            <ArrowLeftIcon />
          </button>
          <span className="detail__top-label">{t('productDetails')}</span>
          <FavoriteButton product={product} />
        </div>

        <div className="detail__layout">
          <div className="detail__image-wrap">
            <span className="detail__image-orbit" aria-hidden="true" />
            <img className="detail__image" src={product.image} alt={displayName} />
            {hasProductDiscount ? (
              <span className="detail__badge">−{product.discount}%</span>
            ) : null}
          </div>

          <div className="detail__body">
            <div className="detail__meta">
              <span className="detail__type">
                {t(product.type === 'digital' ? 'filterDigital' : 'filterPhysical')}
              </span>
              <Rating value={product.rating} count={product.ratingCount} />
            </div>

            <h2 className="detail__title" id="product-detail-title">{displayName}</h2>

            <div className="detail__price-row">
              <span className="detail__price">{formatCoins(finalPrice)} <Coin /></span>
              {finalPrice < product.price ? (
                <span className="detail__price-old">{formatCoins(product.price)} <Coin /></span>
              ) : null}
            </div>

            {hasStudentDiscount ? (
              <div className="detail__student">
                <div>
                  <span className="detail__student-label">{t('studentDiscount')}</span>
                  <span className="detail__student-note">{t('youSave')}</span>
                </div>
                <span className="detail__student-value">−{formatCoins(savings)} <Coin /></span>
              </div>
            ) : null}

            <p className="detail__desc">{displayDescription}</p>

            {product.course ? (
              <a className="detail__course" href={product.course.url} target="_blank" rel="noreferrer">
                <span className="detail__course-label">{t('relatedCourse')}</span>
                <span className="detail__course-title">{product.course.title}</span>
                <span className="detail__course-open">{t('openCourse')} →</span>
              </a>
            ) : null}

            <div className="detail__purchase">
              <div className="detail__purchase-price">
                <span>{t('finalPrice')}</span>
                <strong>{formatCoins(finalPrice)} <Coin /></strong>
              </div>
              <button className="btn btn-primary detail__add-btn" type="button" onClick={handleBuy}>
                {t('buy')}
              </button>
            </div>
          </div>
        </div>

        {recommended.length > 0 ? (
          <div className="detail__recommended">
            <div className="detail__rec-head">
              <span className="shop-section__kicker">MSI Shop</span>
              <h3 className="detail__rec-title">{t('recommended')}</h3>
            </div>
            <ProductRow products={recommended} loading={false} onOpenProduct={onOpenProduct} />
          </div>
        ) : null}
      </section>

      <div
        className="detail__mobile-purchase"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail__purchase-price">
          <span>{t('finalPrice')}</span>
          <strong>{formatCoins(finalPrice)} <Coin /></strong>
        </div>
        <button className="btn btn-primary detail__add-btn" type="button" onClick={handleBuy}>
          {t('buy')}
        </button>
      </div>
    </div>
  );
}
