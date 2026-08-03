import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import FavoriteButton from './FavoriteButton';
import './ProductCard.scss';

interface Props {
  product: Product;
  onOpen: (product: Product) => void;
  enterDelay?: number;
}

export default function ProductCard({ product, onOpen, enterDelay }: Props) {
  const { t } = useLang();
  const { addItem } = useCart();
  const { user, openAuth } = useAuth();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuth();
      return;
    }
    addItem(product);
  };

  const displayName = t(product.nameKey) || product.name;
  const displayDesc = t(product.descKey) || product.description;
  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount! / 100))
    : product.price;

  return (
    <article
      className={`card ${enterDelay !== undefined ? 'card--enter' : ''}`}
      style={enterDelay !== undefined ? { animationDelay: `${enterDelay}ms` } : undefined}
      onClick={() => onOpen(product)}
    >
      {hasDiscount && (
        <div className="card__badge">-{product.discount}%</div>
      )}
      <FavoriteButton product={product} />
      <div className="card__image-wrap">
        <img
          className="card__image"
          src={product.image}
          alt={displayName}
          loading="lazy"
        />
      </div>
      <div className="card__body">
        <h3 className="card__title">{displayName}</h3>
        <p className="card__desc">{displayDesc}</p>
        <div className="card__footer">
          <div className="card__price-wrap">
            {hasDiscount && (
              <span className="card__price-old">{t('currency')}{product.price}</span>
            )}
            <span className={`card__price ${hasDiscount ? 'card__price--sale' : ''}`}>
              {t('currency')}{discountedPrice}
            </span>
          </div>
          <button className="card__btn" onClick={handleAdd}>
            {t('addToCart')}
          </button>
        </div>
      </div>
    </article>
  );
}
