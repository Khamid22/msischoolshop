import { useEffect, useState } from 'react';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getProductPrice, getUnitPrice } from '../utils/currency';
import FavoriteButton from './FavoriteButton';
import Coin from './Coin';
import { ArrowLeftIcon, CheckIcon } from './icons';
import type { Product, ProductVariant } from '../types';
import './ProductDetail.scss';

interface Props {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetail({ product, onClose }: Props) {
  const { t } = useLang();
  const { buyNow } = useCart();
  const { user, openAuth } = useAuth();
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    if (!product) return;
    setVariant(product.variants?.find((item) => item.active !== false && (item.stock === undefined || item.stock > 0)) || null);
    setActiveImage(product.images?.[0] || product.image);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const displayName = t(product.nameKey) || product.name;
  const displayDescription = t(product.descKey) || product.description;
  const productPrice = getProductPrice(product, variant?.price);
  const finalPrice = getUnitPrice(product, user, variant?.price);
  const hasStudentDiscount = finalPrice < productPrice;
  const savings = productPrice - finalPrice;
  const variants = product.variants?.filter((item) => item.active !== false) || [];
  const images = product.images?.length ? product.images : [product.image];
  const isPhysical = product.fulfillmentType
    ? product.fulfillmentType === 'physical_pickup'
    : product.type === 'physical';
  const isUnavailable = Boolean(product.variants?.length && !variant)
    || Boolean(variant && variant.stock !== undefined && variant.stock <= 0);

  const handleAdd = () => {
    if (isUnavailable) return;
    if (!user) {
      openAuth();
      return;
    }
    buyNow(product, variant || undefined);
    onClose();
  };

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onClick={onClose}>
      <section className="detail__card" onClick={(event) => event.stopPropagation()}>
        <header className="detail__top">
          <button className="detail__back" type="button" onClick={onClose} aria-label={t('close')}><ArrowLeftIcon /></button>
          <span className="detail__top-label">{t('productDetails')}</span>
          <FavoriteButton product={product} />
        </header>

        <div className="detail__hero">
          <img className="detail__image" src={activeImage || product.image} alt={displayName} />
          {product.discount ? <span className="detail__badge">−{product.discount}%</span> : null}
        </div>

        <div className="detail__thumbs">
          {images.map((image) => (
            <button className={`detail__thumb ${activeImage === image ? 'detail__thumb--active' : ''}`} key={image} type="button" onClick={() => setActiveImage(image)} aria-label={displayName}>
              <img src={image} alt="" />
            </button>
          ))}
        </div>

        <div className="detail__body">
          <div className="detail__title-row">
            <div>
              <span className="detail__type">{t(product.type === 'digital' ? 'filterDigital' : 'filterPhysical')}</span>
              <h2 className="detail__title" id="product-detail-title">{displayName}</h2>
            </div>
            {product.rating !== undefined ? <span className="detail__rating">★ {product.rating} <small>({product.ratingCount ?? 0})</small></span> : null}
          </div>

          <div className="detail__price-row">
            <span className="detail__price">{formatCoins(finalPrice)} <Coin /></span>
            {finalPrice < productPrice ? <span className="detail__price-old">{formatCoins(productPrice)}</span> : null}
          </div>

          {hasStudentDiscount ? (
            <div className="detail__student">
              <span className="detail__student-icon"><CheckIcon /></span>
              <span><strong>{t('studentDiscount')}</strong><small>{t('youSave')} {formatCoins(savings)} MSI Coin</small></span>
              <b>−{user?.discount}%</b>
            </div>
          ) : null}

          {variants.length > 0 ? (
            <section className="detail__section">
              <span className="detail__section-title" id="product-options-title">{product.variantLabel || t('chooseOption')}</span>
              <div className="detail__variants" role="group" aria-labelledby="product-options-title">
                {variants.map((option) => (
                  <button key={option.id} className={variant?.id === option.id ? 'detail__variant detail__variant--active' : 'detail__variant'} type="button" aria-pressed={variant?.id === option.id} disabled={option.stock !== undefined && option.stock <= 0} onClick={() => setVariant(option)}><span>{option.label}</span><strong>{formatCoins(getUnitPrice(product, user, option.price))} <Coin /></strong></button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="detail__section">
            <span className="detail__section-title">{t('descriptionLabel')}</span>
            <p className="detail__desc">{displayDescription}</p>
          </section>

          {product.course ? (
            <a className="detail__info-card" href={product.course.url} target="_blank" rel="noreferrer">
              <span className="detail__info-mark">↗</span>
              <span><small>{t('relatedCourse')}</small><strong>{product.course.title}</strong></span>
              <span>›</span>
            </a>
          ) : isPhysical ? (
            <div className="detail__info-card">
              <span className="detail__info-mark">⌖</span>
              <span><small>{t('pickupAt')}</small><strong>{t('nextPickup')}: 16:00–17:00</strong></span>
            </div>
          ) : <div className="detail__info-card"><span className="detail__info-mark">✓</span><span><small>{t('digitalFulfillment')}</small><strong>{t('digitalFulfillmentHelp')}</strong></span></div>}

          {product.rating !== undefined ? <section className="detail__ratings">
            <div><strong>{product.rating ?? '4.8'}</strong><span>★★★★★</span><small>{product.ratingCount ?? 24} {t('ratings')}</small></div>
            <div className="detail__bars">
              {[92, 68, 28].map((width, index) => <span key={width}><small>{5 - index}</small><i><b style={{ width: `${width}%` }} /></i></span>)}
            </div>
          </section> : null}
        </div>
      </section>

      <div className="detail__purchase" onClick={(event) => event.stopPropagation()}>
        <div className="detail__purchase-price"><span>{t('total')}</span><strong>{formatCoins(finalPrice)} <Coin /></strong></div>
        <button className="btn btn-primary detail__add-btn" type="button" onClick={handleAdd} disabled={isUnavailable}>{isUnavailable ? t('outOfStock') : t('buy')}</button>
      </div>
    </div>
  );
}
