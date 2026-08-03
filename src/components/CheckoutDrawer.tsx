import { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchSlots } from '../api';
import { formatCoins } from '../utils/currency';
import type { PickupSlot } from '../types';
import Coin from './Coin';
import { XIcon } from './icons';
import './CheckoutDrawer.scss';

export default function CheckoutDrawer() {
  const { isCheckoutOpen, closeCheckout, submitOrder, totalPrice, originalPrice, savings } = useCart();
  const { user, openAuth } = useAuth();
  const { t } = useLang();

  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isCheckoutOpen) {
      fetchSlots().then((data) => {
        setSlots(data);
        setSlotId((prev) => prev || data[0]?.id || '');
      });
      setError('');
    }
  }, [isCheckoutOpen]);

  const selectedSlot = slots.find((s) => s.id === slotId);

  const insufficient = !!user && user.balance < totalPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user) {
      openAuth();
      return;
    }
    if (!selectedSlot) {
      setError(t('pickupSlot'));
      return;
    }
    const ok = submitOrder({
      customerName: user.name,
      customerPhone: user.phone,
      deliveryAddress: selectedSlot.location,
      deliveryMethod: 'pickup',
      pickupSlot: `${selectedSlot.label} · ${selectedSlot.when}`,
    });
    if (!ok) {
      setError(t('insufficientBalance'));
    }
  };

  return (
    <>
      <div className={`checkout-overlay ${isCheckoutOpen ? 'checkout-overlay--open' : ''}`} onClick={closeCheckout} />
      <aside className={`checkout-drawer ${isCheckoutOpen ? 'checkout-drawer--open' : ''}`}>
        <div className="checkout-drawer__header">
          <h2 className="checkout-drawer__title">{t('checkoutTitle')}</h2>
          <button className="checkout-drawer__close" onClick={closeCheckout} aria-label={t('close')}>
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

              <section className="checkout-form__slots">
                <h3 className="checkout-form__slots-title">{t('pickupSlot')}</h3>
                <div className="checkout-form__slots-list">
                  {slots.map((slot) => (
                    <label key={slot.id} className={`slot ${slot.id === slotId ? 'slot--active' : ''}`}>
                      <input
                        type="radio"
                        name="pickup-slot"
                        checked={slot.id === slotId}
                        onChange={() => setSlotId(slot.id)}
                      />
                      <span className="slot__body">
                        <span className="slot__label">{slot.label}</span>
                        <span className="slot__when">{slot.when} · {slot.location}</span>
                      </span>
                    </label>
                  ))}
                </div>
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
