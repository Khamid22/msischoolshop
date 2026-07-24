import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import './CartDrawer.scss';

function getDiscountedPrice(product: { price: number; discount?: number }): number {
  if (product.discount && product.discount > 0) {
    return Math.round(product.price * (1 - product.discount / 100));
  }
  return product.price;
}

export default function CartDrawer() {
  const { items, isOpen, close, removeItem, updateQuantity, clearCart, totalItems, totalPrice, openCheckout } = useCart();
  const { t } = useLang();

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'cart-overlay--open' : ''}`} onClick={close} />
      <aside className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`}>
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            {t('cart')} ({totalItems})
          </h2>
          <button className="cart-drawer__close" onClick={close}>
            ✕
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
                    <span className="cart-item__price">{t('currency')}{getDiscountedPrice(item.product)}</span>
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
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-drawer__footer">
              <div className="cart-drawer__total">
                <span>{t('total')}</span>
                <span className="cart-drawer__total-price">{t('currency')}{totalPrice}</span>
              </div>
              <button className="cart-drawer__checkout" onClick={openCheckout}>{t('checkout')}</button>
              <button className="cart-drawer__clear" onClick={clearCart}>
                {t('clearCart')}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
