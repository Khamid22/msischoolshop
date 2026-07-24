import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import './ProductCard.scss';

interface Props {
  product: Product;
  onOpen: (product: Product) => void;
}

export default function ProductCard({ product, onOpen }: Props) {
  const { t } = useLang();
  const { addItem } = useCart();

  const displayName = product.name || t(product.nameKey);
  const displayDesc = product.description || t(product.descKey);
  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount! / 100))
    : product.price;

  return (
    <article className="card" onClick={() => onOpen(product)}>
      {hasDiscount && (
        <div className="card__badge">-{product.discount}%</div>
      )}
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
          <button className="card__btn" onClick={(e) => { e.stopPropagation(); addItem(product); }}>
            {t('addToCart')}
          </button>
        </div>
      </div>
    </article>
  );
}
