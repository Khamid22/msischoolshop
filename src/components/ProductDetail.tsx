import { useMemo } from 'react';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
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
  const { addItem } = useCart();

  const recommended = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.id !== product!.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
  }, [product, allProducts]);

  if (!product) return null;

  const displayName = product.name || t(product.nameKey);
  const displayDesc = product.description || t(product.descKey);
  const hasDiscount = product.discount && product.discount > 0;
  const discountedPrice = hasDiscount
    ? Math.round(product.price * (1 - product.discount! / 100))
    : product.price;

  const handleAdd = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    addItem(p);
  };

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail">
        <button className="detail__close" onClick={onClose}>✕</button>

        <div className="detail__image-wrap">
          <img className="detail__image" src={product.image} alt={displayName} />
          {hasDiscount && (
            <div className="detail__badge">-{product.discount}%</div>
          )}
        </div>

        <div className="detail__body">
          <span className="detail__type">
            {product.type === 'digital' ? '⚡ Digital' : '📦 Physical'}
          </span>

          <h2 className="detail__title">{displayName}</h2>
          <p className="detail__desc">{displayDesc}</p>

          <div className="detail__price-row">
            {hasDiscount && (
              <span className="detail__price-old">{t('currency')}{product.price}</span>
            )}
            <span className={`detail__price ${hasDiscount ? 'detail__price--sale' : ''}`}>
              {t('currency')}{discountedPrice}
            </span>
            {hasDiscount && (
              <span className="detail__save">-{product.discount}%</span>
            )}
          </div>

          <button className="detail__add-btn" onClick={(e) => handleAdd(e, product)}>
            {t('addToCart')} — {t('currency')}{discountedPrice}
          </button>
        </div>

        {recommended.length > 0 && (
          <div className="detail__recommended">
            <h3 className="detail__rec-title">{t('recommended')}</h3>
            <div className="detail__rec-grid">
              {recommended.map((p) => {
                const recName = p.name || t(p.nameKey);
                const recHasDiscount = p.discount && p.discount > 0;
                const recPrice = recHasDiscount
                  ? Math.round(p.price * (1 - p.discount! / 100))
                  : p.price;

                return (
                  <div
                    key={p.id}
                    className="detail__rec-card"
                    onClick={() => onOpenProduct(p)}
                  >
                    <div className="detail__rec-img-wrap">
                      <img className="detail__rec-img" src={p.image} alt={recName} />
                      {recHasDiscount && (
                        <span className="detail__rec-badge">-{p.discount}%</span>
                      )}
                    </div>
                    <div className="detail__rec-info">
                      <span className="detail__rec-name">{recName}</span>
                      <div className="detail__rec-price-row">
                        {recHasDiscount && (
                          <span className="detail__rec-price-old">{t('currency')}{p.price}</span>
                        )}
                        <span className={`detail__rec-price ${recHasDiscount ? 'detail__rec-price--sale' : ''}`}>
                          {t('currency')}{recPrice}
                        </span>
                      </div>
                    </div>
                    <button
                      className="detail__rec-add"
                      onClick={(e) => handleAdd(e, p)}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
