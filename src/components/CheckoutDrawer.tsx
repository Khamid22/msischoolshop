import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import Coin from './Coin';
import { ArrowLeftIcon, CheckIcon } from './icons';
import './CheckoutDrawer.scss';

const PICKUP_SLOTS = [
  { id: 'today', time: '16:00–17:00', place: 'MSI Campus · Lobby' },
  { id: 'tomorrow', time: '10:00–11:00', place: 'MSI Campus · Lobby' },
  { id: 'tomorrow-late', time: '15:00–16:00', place: 'MSI Campus · Library' },
];

export default function CheckoutDrawer() {
  const { isCheckoutOpen, closeCheckout, submitOrder, totalPrice, originalPrice, savings } = useCart();
  const { user, openAuth } = useAuth();
  const { t } = useLang();
  const [selectedSlot, setSelectedSlot] = useState(PICKUP_SLOTS[0].id);
  const [error, setError] = useState('');
  const insufficient = Boolean(user && user.balance < totalPrice);

  useEffect(() => {
    if (!isCheckoutOpen) return;
    setError('');
    setSelectedSlot(PICKUP_SLOTS[0].id);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCheckout();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCheckoutOpen, closeCheckout]);

  if (!isCheckoutOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!user) {
      openAuth();
      return;
    }
    const slot = PICKUP_SLOTS.find((item) => item.id === selectedSlot) || PICKUP_SLOTS[0];
    const ok = submitOrder({
      customerName: user.name,
      customerPhone: user.phone,
      deliveryAddress: slot.place,
      deliveryMethod: 'pickup',
      pickupSlot: `${slot.time} · ${slot.place}`,
    });
    if (!ok) setError(t('insufficientBalance'));
  };

  return (
    <div className="checkout-overlay" onClick={closeCheckout}>
      <aside className="checkout-drawer" role="dialog" aria-modal="true" aria-labelledby="checkout-drawer-title" onClick={(event) => event.stopPropagation()}>
        <header className="checkout-drawer__header">
          <button className="checkout-drawer__close" type="button" onClick={closeCheckout} aria-label={t('close')}><ArrowLeftIcon /></button>
          <h2 className="checkout-drawer__title" id="checkout-drawer-title">{t('checkoutTitle')}</h2>
          <span />
        </header>

        <form className="checkout-form" onSubmit={handleSubmit}>
          {!user ? (
            <div className="checkout-form__auth">
              <p>{t('account')}</p>
              <button type="button" className="btn btn-primary btn-block" onClick={openAuth}>{t('login')} / {t('register')}</button>
            </div>
          ) : (
            <>
              <section className="checkout-section">
                <div className="checkout-section__head"><strong>{t('lmsIdentity')}</strong><span><CheckIcon /> {t('fromLms')}</span></div>
                <div className="checkout-identity">
                  <span className="checkout-identity__avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                  <span><strong>{user.name}</strong><small>{user.group || '11-A'} · {user.studentId || 'STU-0000'}</small></span>
                  {user.discount ? <b>−{user.discount}%</b> : null}
                </div>
              </section>

              <section className="checkout-section">
                <div className="checkout-section__head checkout-section__head--stack"><strong>{t('pickupSlot')}</strong><small>{t('pickupSlotHelp')}</small></div>
                <div className="pickup-slots">
                  {PICKUP_SLOTS.map((slot, index) => (
                    <label className={selectedSlot === slot.id ? 'pickup-slot pickup-slot--active' : 'pickup-slot'} key={slot.id}>
                      <input type="radio" name="pickup-slot" checked={selectedSlot === slot.id} onChange={() => setSelectedSlot(slot.id)} />
                      <span><strong>{index === 0 ? t('today') : t('nextPickup')}</strong><small>{slot.place}</small></span>
                      <b>{slot.time}</b>
                    </label>
                  ))}
                </div>
              </section>

              <section className="checkout-section">
                <div className="checkout-section__head"><strong>{t('payment')}</strong></div>
                <div className="checkout-payment">
                  <span className="checkout-payment__coin"><Coin /></span>
                  <span><strong>{t('goldMsiCoin')}</strong><small>{t('coinsOnly')}</small></span>
                  <b>{formatCoins(user.balance)} <Coin /></b>
                </div>
              </section>

              <section className="checkout-summary">
                <div><span>{t('itemsSubtotal')}</span><span>{formatCoins(originalPrice)}</span></div>
                {savings > 0 ? <div><span>{t('studentDiscount')}</span><span className="checkout-summary__save">−{formatCoins(savings)}</span></div> : null}
                <div className="checkout-summary__total"><strong>{t('toPay')}</strong><strong>{formatCoins(totalPrice)} <Coin /></strong></div>
                <p><Coin /> {t('balanceAfter')}: {formatCoins(Math.max(0, user.balance - totalPrice))}</p>
              </section>

              {insufficient || error ? <div className="checkout-form__insufficient">{error || t('insufficientBalance')}</div> : null}

              <div className="checkout-form__submit-wrap">
                <button className="btn btn-primary btn-block checkout-form__submit" type="submit" disabled={insufficient}>{t('payCoins')} · {formatCoins(totalPrice)}</button>
                <p className="checkout-form__hint">{t('sendCodeToChat')}</p>
              </div>
            </>
          )}
        </form>
      </aside>
    </div>
  );
}
