import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import type { DeliveryMethod } from '../types';
import './CheckoutDrawer.scss';

const DELIVERY_OPTIONS: DeliveryMethod[] = ['courier', 'pickup', 'post'];

export default function CheckoutDrawer() {
  const { items, isCheckoutOpen, closeCheckout, submitOrder, totalPrice } = useCart();
  const { user } = useAuth();
  const { t } = useLang();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [delivery, setDelivery] = useState<DeliveryMethod>('courier');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('errorFillRequired'));
      return;
    }
    if (!phone.trim()) {
      setError(t('errorFillRequired'));
      return;
    }
    if (delivery !== 'pickup' && !address.trim()) {
      setError(t('errorFillRequired'));
      return;
    }

    submitOrder({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      deliveryAddress: delivery === 'pickup' ? t('deliveryPickupPoint') : address.trim(),
      deliveryMethod: delivery,
    });
  };

  if (!isCheckoutOpen) return null;

  return (
    <>
      <div className="checkout-overlay" onClick={closeCheckout} />
      <aside className={`checkout-drawer ${isCheckoutOpen ? 'checkout-drawer--open' : ''}`}>
        <div className="checkout-drawer__header">
          <h2 className="checkout-drawer__title">{t('checkoutTitle')}</h2>
          <button className="checkout-drawer__close" onClick={closeCheckout}>✕</button>
        </div>

        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="checkout-form__summary">
            {items.map((item) => (
              <div key={item.product.id} className="checkout-form__summary-row">
                <span className="checkout-form__summary-name">
                  {t(item.product.nameKey)} × {item.quantity}
                </span>
                <span className="checkout-form__summary-price">
                  {t('currency')}{item.product.price * item.quantity}
                </span>
              </div>
            ))}
            <div className="checkout-form__summary-total">
              <span>{t('total')}</span>
              <span>{t('currency')}{totalPrice}</span>
            </div>
          </div>

          <div className="checkout-form__fields">
            <label className="checkout-form__label">
              <span className="checkout-form__label-text">{t('name')}*</span>
              <input
                className="checkout-form__input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="checkout-form__label">
              <span className="checkout-form__label-text">{t('phone')}*</span>
              <input
                className="checkout-form__input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 XX XXX XX XX"
                required
              />
            </label>

            <div className="checkout-form__label">
              <span className="checkout-form__label-text">{t('deliveryMethod')}*</span>
              <div className="checkout-form__delivery-options">
                {DELIVERY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`checkout-form__delivery-btn ${delivery === opt ? 'checkout-form__delivery-btn--active' : ''}`}
                    onClick={() => setDelivery(opt)}
                  >
                    {t(`delivery${opt.charAt(0).toUpperCase() + opt.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            {delivery !== 'pickup' && (
              <label className="checkout-form__label">
                <span className="checkout-form__label-text">{t('deliveryAddress')}*</span>
                <textarea
                  className="checkout-form__input checkout-form__input--area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  required
                />
              </label>
            )}
          </div>

          {error && <span className="checkout-form__error">{error}</span>}

          <button className="checkout-form__submit" type="submit">
            {t('placeOrder')} — {t('currency')}{totalPrice}
          </button>
        </form>
      </aside>
    </>
  );
}
