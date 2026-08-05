import { useMemo } from 'react';
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
    return allProducts
      .filter((p) => p.id !== product.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
  }, [product, allProducts]);

  if (!product) return null;

  const displayName = t(product.nameKey) || product.name;
  const displayDesc = t(product.descKey) || product.description;
  const hasDiscount = product.discount && product.discount > 0;
  const price = getProductPrice(product);
  const studentPrice = getUnitPrice(product, user);
  const showStudentPrice = user?.discount && user.discount > 0 && studentPrice < price;
  const savings = price - studentPrice;

  const handleAdd = () => {
    if (!user) {
      openAuth();
      return;
    }
    buyNow(product);
  };

  return (
    <div className="detail" onClick={onClose}>
      <div className="detail__card" onClick={(e) => e.stopPropagation()}>
        <div className="detail__top">
          <button className="detail__back" onClick={onClose} aria-label={t('close')}>
            <ArrowLeftIcon />
          </button>
          <FavoriteButton product={product} />
        </div>

        <div className="detail__image-wrap">
          <img className="lighten detail__image" src={product.image} alt={displayName} />
          {hasDiscount && (
            <span className="tag tag-accent detail__badge">-{product.discount}%</span>
          )}
        </div>

        <div className="detail__body">
          <div className="detail__meta">
            <span className="tag tag-neutral detail__type">
              {product.type === 'digital' ? 'Digital' : 'Physical'}
            </span>
            <Rating value={product.rating} count={product.ratingCount} />
          </div>

          <h2 className="detail__title">{displayName}</h2>

          <div className="detail__price-row">
            {hasDiscount && (
              <span className="detail__price-old">{formatCoins(product.price)} <Coin /></span>
            )}
            <span className={`detail__price ${hasDiscount ? 'detail__price--sale' : ''}`}>
              {formatCoins(price)} <Coin />
            </span>
            {showStudentPrice && (
              <span className="tag tag-accent detail__save">−{user.discount}%</span>
            )}
          </div>

          {showStudentPrice && (
            <div className="detail__student">
              <span className="detail__student-label">{t('studentDiscount')} ({t('youSave').toLowerCase()})</span>
              <span className="detail__student-value">
                {formatCoins(savings)} <Coin />
              </span>
            </div>
          )}

          <p className="detail__desc">{displayDesc}</p>

          {product.course && (
            <a
              className="detail__course"
              href={product.course.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="detail__course-label">{t('relatedCourse')}</span>
              <span className="detail__course-title">{product.course.title}</span>
              <span className="detail__course-open">{t('openCourse')} →</span>
            </a>
          )}

          <button className="btn btn-primary btn-block detail__add-btn" onClick={handleAdd}>
            {t('buy')} — {formatCoins(studentPrice)} <Coin />
          </button>
        </div>

        {recommended.length > 0 && (
          <div className="detail__recommended">
            <h3 className="detail__rec-title">{t('recommended')}</h3>
            <ProductRow products={recommended} loading={false} onOpenProduct={onOpenProduct} />
          </div>
        )}
      </div>
    </div>
  );
}
