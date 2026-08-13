import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { formatCoins, getUnitPrice } from '../utils/currency';
import Coin from './Coin';
import { MinusIcon, PlusIcon, TrashIcon } from './icons';
import './CartPage.scss';

interface Props {
  onBrowse: () => void;
}

export default function CartPage({ onBrowse }: Props) {
  const { items, updateQuantity, removeFromCart, openCheckout, totalPrice, originalPrice, savings } = useCart();
  const { user, openAuth } = useAuth();
  const { t } = useLang();
  const remaining = user ? user.balance - totalPrice : 0;

  if (items.length === 0) {
    return (
      <div className="cart-page cart-page--empty">
        <span className="cart-page__empty-mark" aria-hidden="true">M</span>
        <h2>{t('cartEmptyTitle')}</h2>
        <p>{t('cartEmptyBody')}</p>
        <button className="btn btn-primary" type="button" onClick={onBrowse}>{t('viewCatalog')}</button>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!user) {
      openAuth();
      return;
    }
    openCheckout();
  };

  return (
    <div className="cart-page">
      <div className="cart-page__list">
        {items.map((item) => {
          const name = t(item.product.nameKey) || item.product.name;
          const lineTotal = getUnitPrice(item.product, user) * item.quantity;
          return (
            <article className="cart-line" key={item.product.id}>
              <span className="cart-line__image"><img src={item.product.image} alt="" /></span>
              <div className="cart-line__body">
                <div className="cart-line__top">
                  <strong>{name}</strong>
                  <button type="button" onClick={() => removeFromCart(item.product.id)} aria-label={t('removeFromCart')}>
                    <TrashIcon />
                  </button>
                </div>
                <span className="cart-line__variant">
                  {t(item.product.type === 'digital' ? 'filterDigital' : 'filterPhysical')}
                </span>
                <div className="cart-line__foot">
                  <div className="cart-line__qty" aria-label={t('quantity')}>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} aria-label={t('decrease')}><MinusIcon /></button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} aria-label={t('increase')}><PlusIcon /></button>
                  </div>
                  <strong className="cart-line__price">{formatCoins(lineTotal)} <Coin /></strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button className="cart-page__promo" type="button">
        <span aria-hidden="true">◇</span>
        <span>{t('promoCode')}</span>
        <span aria-hidden="true">›</span>
      </button>

      <section className="cart-summary" aria-label={t('total')}>
        <div><span>{t('subtotal')}</span><span>{formatCoins(originalPrice)}</span></div>
        {savings > 0 ? <div><span>{t('studentDiscount')} · {user?.discount || 0}%</span><span className="cart-summary__saving">−{formatCoins(savings)}</span></div> : null}
        <div className="cart-summary__total"><strong>{t('total')}</strong><strong>{formatCoins(totalPrice)} <Coin /></strong></div>
        {user ? (
          <p className={remaining < 0 ? 'cart-summary__balance cart-summary__balance--low' : 'cart-summary__balance'}>
            <Coin /> {t('balanceAfter')}: {formatCoins(Math.max(0, remaining))}
          </p>
        ) : null}
      </section>

      <div className="cart-page__checkout">
        <button className="btn btn-primary btn-block" type="button" onClick={handleCheckout} disabled={Boolean(user && remaining < 0)}>
          {t('checkout')} · {formatCoins(totalPrice)} MSI Coin
        </button>
      </div>
    </div>
  );
}
