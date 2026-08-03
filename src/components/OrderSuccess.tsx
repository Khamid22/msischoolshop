import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import Coin from './Coin';
import './OrderSuccess.scss';

export default function OrderSuccess() {
  const { lastOrder, closeSuccess } = useCart();
  const { user } = useAuth();
  const { t } = useLang();

  if (!lastOrder) return null;

  return (
    <>
      <div className="success-overlay" onClick={closeSuccess} />
      <div className="success-modal">
        <div className="success-modal__icon">✓</div>
        <h2 className="success-modal__title">{t('orderSuccessTitle')}</h2>
        <p className="success-modal__subtitle">{t('orderSuccessSubtitle')} {lastOrder.customerName}.</p>

        {lastOrder.pickupCode && (
          <div className="success-modal__code">
            <span className="success-modal__code-label">{t('orderPickupCode')}</span>
            <span className="success-modal__code-value">{lastOrder.pickupCode}</span>
            {lastOrder.pickupSlot && (
              <span className="success-modal__code-slot">{lastOrder.pickupSlot}</span>
            )}
            <span className="success-modal__code-hint">{t('sendCodeToChat')}</span>
          </div>
        )}

        <p className="success-modal__sum">
          {t('orderSuccessSum')} {formatCoins(lastOrder.totalPrice)} <Coin />.
        </p>
        <p className="success-modal__balance">
          {t('balance')}: {formatCoins(user?.balance ?? 0)} <Coin />
        </p>
        <button className="btn btn-primary btn-block success-modal__btn" onClick={closeSuccess}>
          {t('close')}
        </button>
      </div>
    </>
  );
}
