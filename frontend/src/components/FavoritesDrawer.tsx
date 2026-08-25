import { useFavorites } from '../contexts/FavoritesContext';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import type { Product } from '../types';
import Coin from './Coin';
import './FavoritesDrawer.scss';

function getDiscountedPrice(product: Product): number {
  if (product.discount && product.discount > 0) {
    return Math.round(product.price * (1 - product.discount / 100));
  }
  return product.price;
}

export default function FavoritesDrawer() {
  const { favorites, isOpen, close, toggleFavorite } = useFavorites();
  const { t } = useLang();
  const { buyNow } = useCart();
  const { user, openAuth } = useAuth();

  const handleAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!user) {
      openAuth();
      return;
    }
    buyNow(product);
  };

  return (
    <>
      <div className={`fav-overlay ${isOpen ? 'fav-overlay--open' : ''}`} onClick={close} />
      <aside className={`fav-drawer ${isOpen ? 'fav-drawer--open' : ''}`}>
        <div className="fav-drawer__header">
          <h2 className="fav-drawer__title">
            {t('favorites')} ({favorites.length})
          </h2>
          <button className="fav-drawer__close" onClick={close}>✕</button>
        </div>

        {favorites.length === 0 ? (
          <div className="fav-drawer__empty">{t('favoritesEmpty')}</div>
        ) : (
          <ul className="fav-drawer__list">
            {favorites.map((product) => {
              const hasDiscount = product.discount && product.discount > 0;
              const price = getDiscountedPrice(product);
              return (
                <li key={product.id} className="fav-item">
                  <img
                    className="fav-item__img"
                    src={product.image}
                    alt={t(product.nameKey) || product.name}
                  />
                  <div className="fav-item__info">
                    <span className="fav-item__name">{t(product.nameKey) || product.name}</span>
                    <span className="fav-item__price-wrap">
                      {hasDiscount && (
                        <span className="fav-item__price-old">{formatCoins(product.price)} <Coin /></span>
                      )}
                      <span className={`fav-item__price ${hasDiscount ? 'fav-item__price--sale' : ''}`}>
                        {formatCoins(price)} <Coin />
                      </span>
                    </span>
                  </div>
                  <div className="fav-item__actions">
                    <button
                      className="fav-item__heart"
                      onClick={() => toggleFavorite(product)}
                      title={t('removeFromFavorites')}
                    >
                      ♥
                    </button>
                    <button
                      className="btn btn-primary fav-item__cart"
                      onClick={(e) => handleAdd(e, product)}
                    >
                      {t('buy')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </>
  );
}
