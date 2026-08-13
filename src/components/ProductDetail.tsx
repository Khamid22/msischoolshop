import { useEffect, useState } from 'react';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getProductPrice, getUnitPrice } from '../utils/currency';
import FavoriteButton from './FavoriteButton';
import Coin from './Coin';
import { ArrowLeftIcon, CheckIcon } from './icons';
import type { Product } from '../types';
import './ProductDetail.scss';

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdded: () => void;
}

export default function ProductDetail({ product, onClose, onAdded }: Props) {
  const { t } = useLang();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [variant, setVariant] = useState('M');

  useEffect(() => {
    if (!product) return;
    setVariant(product.type === 'digital' ? '3 mo' : 'M');
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
  const hasStudentDiscount = finalPrice < productPrice;
  const savings = product.price - finalPrice;
  const variants = product.type === 'digital' ? ['3 mo', '6 mo', '12 mo'] : ['S', 'M', 'L', 'XL'];

  const handleAdd = () => {
    addToCart(product);
    onAdded();
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
          <img className="detail__image" src={product.image} alt={displayName} />
          {product.discount ? <span className="detail__badge">−{product.discount}%</span> : null}
        </div>

        <div className="detail__thumbs" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span className={`detail__thumb ${index === 0 ? 'detail__thumb--active' : ''}`} key={index}>
              <img src={product.image} alt="" />
            </span>
          ))}
        </div>

        <div className="detail__body">
          <div className="detail__title-row">
            <div>
              <span className="detail__type">{t(product.type === 'digital' ? 'filterDigital' : 'filterPhysical')}</span>
              <h2 className="detail__title" id="product-detail-title">{displayName}</h2>
            </div>
            <span className="detail__rating">★ {product.rating ?? '4.8'} <small>({product.ratingCount ?? 24})</small></span>
          </div>

          <div className="detail__price-row">
            <span className="detail__price">{formatCoins(finalPrice)} <Coin /></span>
            {finalPrice < product.price ? <span className="detail__price-old">{formatCoins(product.price)}</span> : null}
          </div>

          {hasStudentDiscount ? (
            <div className="detail__student">
              <span className="detail__student-icon"><CheckIcon /></span>
              <span><strong>{t('studentDiscount')}</strong><small>{t('youSave')} {formatCoins(savings)} MSI Coin</small></span>
              <b>−{user?.discount}%</b>
            </div>
          ) : null}

          <section className="detail__section">
            <span className="detail__section-title">{t('packSize')}</span>
            <div className="detail__variants">
              {variants.map((option) => (
                <button key={option} className={variant === option ? 'detail__variant detail__variant--active' : 'detail__variant'} type="button" onClick={() => setVariant(option)}>{option}</button>
              ))}
            </div>
          </section>

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
          ) : (
            <div className="detail__info-card">
              <span className="detail__info-mark">⌖</span>
              <span><small>{t('pickupAt')}</small><strong>{t('nextPickup')}: 16:00–17:00</strong></span>
            </div>
          )}

          <section className="detail__ratings">
            <div><strong>{product.rating ?? '4.8'}</strong><span>★★★★★</span><small>{product.ratingCount ?? 24} {t('ratings')}</small></div>
            <div className="detail__bars">
              {[92, 68, 28].map((width, index) => <span key={width}><small>{5 - index}</small><i><b style={{ width: `${width}%` }} /></i></span>)}
            </div>
          </section>
        </div>
      </section>

      <div className="detail__purchase" onClick={(event) => event.stopPropagation()}>
        <div className="detail__purchase-price"><span>{t('total')}</span><strong>{formatCoins(finalPrice)} <Coin /></strong></div>
        <button className="btn btn-primary detail__add-btn" type="button" onClick={handleAdd}>{t('addToCart')}</button>
      </div>
    </div>
  );
}
