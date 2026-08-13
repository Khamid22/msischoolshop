import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import Coin from './Coin';
import { XIcon } from './icons';
import './CheckoutDrawer.scss';

export default function CheckoutDrawer() {
  const { items, isCheckoutOpen, closeCheckout, submitOrder, totalPrice, originalPrice, savings } = useCart();
  const { user, openAuth } = useAuth();
  const { t } = useLang();

  const [error, setError] = useState('');

  const insufficient = !!user && user.balance < totalPrice;

  useEffect(() => {
    if (!isCheckoutOpen) return;
    setError('');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCheckout();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCheckoutOpen, closeCheckout]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) {
      openAuth();
      return;
    }
    const ok = submitOrder({
      customerName: user.name,
      customerPhone: user.phone,
      deliveryAddress: user.address || '',
      deliveryMethod: 'pickup',
    });
    if (!ok) {
      setError(t('insufficientBalance'));
    }
  };

  return (
    <>
      <div className={`checkout-overlay ${isCheckoutOpen ? 'checkout-overlay--open' : ''}`} onClick={closeCheckout} />
      <aside
        className={`checkout-drawer ${isCheckoutOpen ? 'checkout-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isCheckoutOpen}
        aria-labelledby="checkout-drawer-title"
      >
        <div className="checkout-drawer__grab" aria-hidden="true" />
        <div className="checkout-drawer__header">
          <div>
            <span className="checkout-drawer__eyebrow">MSI Shop</span>
            <h2 className="checkout-drawer__title" id="checkout-drawer-title">{t('checkoutTitle')}</h2>
          </div>
          <button className="checkout-drawer__close" type="button" onClick={closeCheckout} aria-label={t('close')}>
            <XIcon />
          </button>
        </div>

        <form className="checkout-form" onSubmit={handleSubmit}>
          {!user ? (
            <div className="checkout-form__auth">
              <p className="checkout-form__auth-text">{t('account')}</p>
              <button type="button" className="btn btn-primary btn-block" onClick={openAuth}>
                {t('login')} / {t('register')}
              </button>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <section className="checkout-form__item" key={item.product.id}>
                  <span className="checkout-form__item-image">
                    <img src={item.product.image} alt="" />
                  </span>
                  <span className="checkout-form__item-copy">
                    <strong>{t(item.product.nameKey) || item.product.name}</strong>
                    <small>{item.product.type === 'digital' ? t('filterDigital') : t('filterPhysical')}</small>
                  </span>
                  <span className="checkout-form__item-qty">×{item.quantity}</span>
                </section>
              ))}

              <section className="checkout-form__lms card elev-sm">
                <span className="card-kicker">{t('lmsIdentity')}</span>
                <span className="checkout-form__lms-name">{user.name}</span>
                <div className="checkout-form__lms-meta">
                  <span className="checkout-form__lms-chip">{t('studentGroup')}: {user.group || '—'}</span>
                  <span className="checkout-form__lms-chip">{t('studentId')}: {user.studentId || '—'}</span>
                </div>
                {user.discount ? (
                  <span className="tag tag-accent checkout-form__lms-tag">−{user.discount}%</span>
                ) : null}
              </section>

              <section className="checkout-form__summary">
                <div className="checkout-form__row">
                  <span>{t('itemsSubtotal')}</span>
                  <span>{formatCoins(originalPrice)} <Coin /></span>
                </div>
                {savings > 0 && (
                  <div className="checkout-form__row">
                    <span>{t('studentDiscount')} (−{user.discount}%)</span>
                    <span className="checkout-form__row--save">−{formatCoins(savings)} <Coin /></span>
                  </div>
                )}
                <div className="checkout-form__row">
                  <span>{t('balance')}</span>
                  <span>{formatCoins(user.balance)} <Coin /></span>
                </div>
                <div className="checkout-form__total">
                  <span>{t('total')}</span>
                  <span>{formatCoins(totalPrice)} <Coin /></span>
                </div>
              </section>

              {insufficient && (
                <div className="checkout-form__insufficient">{t('insufficientBalance')}</div>
              )}
              {error && <div className="checkout-form__insufficient">{error}</div>}

              <button className="btn btn-primary btn-block checkout-form__submit" type="submit" disabled={insufficient}>
                {t('placeOrder')} — {formatCoins(totalPrice)} <Coin />
              </button>
              <p className="checkout-form__hint">{t('sendCodeToChat')}</p>
            </>
          )}
        </form>
      </aside>
    </>
  );
}
