import { useRef, useState } from 'react';
import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getProductPrice, getUnitPrice } from '../utils/currency';
import FavoriteButton from './FavoriteButton';
import Rating from './Rating';
import Coin from './Coin';
import './ProductCard.scss';

interface Props {
  product: Product;
  onOpen: (product: Product) => void;
  enterDelay?: number;
}

export default function ProductCard({ product, onOpen, enterDelay }: Props) {
  const { t } = useLang();
  const { quickBuy } = useCart();
  const { user, openAuth } = useAuth();
  const [error, setError] = useState('');
  const errorTimer = useRef<number | null>(null);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuth();
      return;
    }
    if (!quickBuy(product)) {
      setError(t('insufficientBalance'));
      if (errorTimer.current) window.clearTimeout(errorTimer.current);
      errorTimer.current = window.setTimeout(() => setError(''), 2500);
    }
  };

  const displayName = t(product.nameKey) || product.name;
  const hasDiscount = product.discount && product.discount > 0;
  const price = getProductPrice(product);
  const studentPrice = getUnitPrice(product, user);
  const showStudentPrice = user?.discount && user.discount > 0 && studentPrice < price;

  return (
    <article
      className={`card ${enterDelay !== undefined ? 'card--enter' : ''}`}
      style={enterDelay !== undefined ? { animationDelay: `${enterDelay}ms` } : undefined}
      onClick={() => onOpen(product)}
    >
      {hasDiscount && (
        <div className="tag tag-accent card__badge">-{product.discount}%</div>
      )}
      <FavoriteButton product={product} />
      <div className="card__image-wrap">
        <img
          className="lighten card__image"
          src={product.image}
          alt={displayName}
          loading="lazy"
        />
      </div>
      <div className="card__body">
        <h3 className="card__title">{displayName}</h3>
        <Rating value={product.rating} count={product.ratingCount} />
        <div className="card__footer">
          <div className="card__price-wrap">
            {hasDiscount && (
              <span className="card__price-old">{formatCoins(product.price)} <Coin /></span>
            )}
            <span className="card__price">
              {formatCoins(price)} <Coin />
            </span>
            {showStudentPrice && (
              <span className="card__price-student">−{user.discount}%</span>
            )}
          </div>
          <button className="btn btn-primary card__btn" onClick={handleAdd}>
            {t('buy')}
          </button>
        </div>
        {error && <span className="card__error">{error}</span>}
      </div>
    </article>
  );
}
