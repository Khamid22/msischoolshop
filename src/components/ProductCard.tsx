import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins, getProductPrice, getUnitPrice } from '../utils/currency';
import FavoriteButton from './FavoriteButton';
import Coin from './Coin';
import './ProductCard.scss';

interface Props {
  product: Product;
  onOpen: (product: Product) => void;
  enterDelay?: number;
}

export default function ProductCard({ product, onOpen, enterDelay }: Props) {
  const { t } = useLang();
  const { user } = useAuth();

  const displayName = t(product.nameKey) || product.name;
  const productPrice = getProductPrice(product);
  const finalPrice = getUnitPrice(product, user);
  const hasProductDiscount = Boolean(product.discount && product.discount > 0);
  const hasStudentDiscount = finalPrice < productPrice;
  const comparePrice = hasProductDiscount ? product.price : hasStudentDiscount ? productPrice : null;

  return (
    <article
      className={`product-card ${enterDelay !== undefined ? 'product-card--enter' : ''}`}
      style={enterDelay !== undefined ? { animationDelay: `${enterDelay}ms` } : undefined}
    >
      {hasProductDiscount ? (
        <span className="product-card__badge">−{product.discount}%</span>
      ) : hasStudentDiscount ? (
        <span className="product-card__badge product-card__badge--student">−{user?.discount}%</span>
      ) : null}
      <FavoriteButton product={product} />

      <button
        className="product-card__image-button"
        type="button"
        onClick={() => onOpen(product)}
        aria-label={`${t('explore')}: ${displayName}`}
      >
        <span className="product-card__image-glow" aria-hidden="true" />
        <img className="product-card__image" src={product.image} alt={displayName} loading="lazy" />
      </button>

      <div className="product-card__body">
        <button className="product-card__title" type="button" onClick={() => onOpen(product)}>
          {displayName}
        </button>
        <div className="product-card__subline">
          {product.rating !== undefined ? (
            <span className="product-card__rating" aria-label={`${product.rating} / 5`}>
              <span aria-hidden="true">★</span> {product.rating}
            </span>
          ) : <span />}
          {product.type ? <span>{t(product.type === 'digital' ? 'filterDigital' : 'filterPhysical')}</span> : null}
        </div>

        <div className="product-card__footer">
          <div className="product-card__price-wrap">
            {comparePrice !== null ? (
              <span className="product-card__price-old">{formatCoins(comparePrice)}</span>
            ) : null}
            <span className="product-card__price">{formatCoins(finalPrice)} <Coin /></span>
          </div>
        </div>
      </div>
    </article>
  );
}
