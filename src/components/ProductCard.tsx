import type { Product } from '../types';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import './ProductCard.scss';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { t } = useLang();
  const { addItem } = useCart();

  return (
    <article className="card">
      <div className="card__image-wrap">
        <img
          className="card__image"
          src={product.image}
          alt={t(product.nameKey)}
          loading="lazy"
        />
      </div>
      <div className="card__body">
        <h3 className="card__title">{t(product.nameKey)}</h3>
        <p className="card__desc">{t(product.descKey)}</p>
        <div className="card__footer">
          <span className="card__price">{t('currency')}{product.price}</span>
          <button className="card__btn" onClick={() => addItem(product)}>
            {t('addToCart')}
          </button>
        </div>
      </div>
    </article>
  );
}
