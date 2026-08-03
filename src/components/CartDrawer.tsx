import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import Coin from './Coin';
import { XIcon } from './icons';
import './CartDrawer.scss';

function getDiscountedPrice(product: { price: number; discount?: number }): number {
  if (product.discount && product.discount > 0) {
    return Math.round(product.price * (1 - product.discount / 100));
  }
  return product.price;
}

export default function CartDrawer() {
  const { items, isOpen, close, removeItem, updateQuantity, clearCart, totalItems, totalPrice, savings, openCheckout } = useCart();
  const { t } = useLang();
  const { user } = useAuth();

  const insufficient = !!user && user.balance < totalPrice;
  const hasStudentDiscount = !!user?.discount && user.discount > 0 && savings > 0;

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'cart-overlay--open' : ''}`} onClick={close} />
      <aside className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`}>
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            {t('cart')} ({totalItems})
          </h2>
          <button className="cart-drawer__close" onClick={close} aria-label={t('close')}>
            <XIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer__empty">{t('cartEmpty')}</div>
        ) : (
          <>
            <ul className="cart-drawer__list">
              {items.map((item) => (
                <li key={item.product.id} className="cart-item">
                  <img
                    className="cart-item__img"
                    src={item.product.image}
                    alt={t(item.product.nameKey) || item.product.name}
                  />
                  <div className="cart-item__info">
                    <span className="cart-item__name">{t(item.product.nameKey) || item.product.name}</span>
                    <span className="cart-item__price">
                      {formatCoins(getDiscountedPrice(item.product))} <Coin />
                    </span>
                    <div className="cart-item__controls">
                      <button
                        className="cart-item__qty-btn"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="cart-item__qty">{item.quantity}</span>
                      <button
                        className="cart-item__qty-btn"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        className="cart-item__remove"
                        onClick={() => removeItem(item.product.id)}
                        aria-label={t('clearFilters')}
                      >
                        <XIcon />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-drawer__footer">
              {hasStudentDiscount && (
                <div className="cart-drawer__row">
                  <span className="cart-drawer__row-label">
                    {t('studentDiscount')} (−{user.discount}%)
                  </span>
                  <span className="cart-drawer__row-value cart-drawer__row-value--save">
                    −{formatCoins(savings)} <Coin />
                  </span>
                </div>
              )}
              {user && (
                <div className="cart-drawer__row">
                  <span className="cart-drawer__row-label">{t('balance')}</span>
                  <span className="cart-drawer__row-value">
                    {formatCoins(user.balance)} <Coin />
                  </span>
                </div>
              )}
              <div className="cart-drawer__total">
                <span>{t('total')}</span>
                <span className="cart-drawer__total-price">
                  {formatCoins(totalPrice)} <Coin />
                </span>
              </div>

              {insufficient && (
                <div className="cart-drawer__insufficient">{t('insufficientBalance')}</div>
              )}

              <button className="btn btn-primary btn-block cart-drawer__checkout" onClick={openCheckout}>
                {t('checkout')} — {formatCoins(totalPrice)} <Coin />
              </button>
              <button className="btn btn-secondary btn-block cart-drawer__clear" onClick={clearCart}>
                {t('clearCart')}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
