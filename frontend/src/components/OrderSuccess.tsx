import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCoins } from '../utils/currency';
import Coin from './Coin';
import OrderDeliveryDetails from './OrderDeliveryDetails';
import './OrderSuccess.scss';

export default function OrderSuccess({ onViewOrder }: { onViewOrder: (orderId: string) => void }) {
  const { lastOrder, closeSuccess, updateLastOrder } = useCart();
  const { user } = useAuth();
  const { t } = useLang();

  if (!lastOrder || lastOrder.userId !== user?.id) return null;
  const isPhysical = lastOrder.fulfillmentType
    ? lastOrder.fulfillmentType === 'physical_pickup'
    : lastOrder.items[0]?.product.type === 'physical';

  return (
    <>
      <div className="success-overlay" onClick={closeSuccess} />
      <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="purchase-success-title">
        <div className="success-modal__icon">✓</div>
        <h2 className="success-modal__title" id="purchase-success-title">{t('orderSuccessTitle')}</h2>
        <p className="success-modal__subtitle">
          {t(isPhysical ? 'orderSuccessPhysicalSubtitle' : 'orderSuccessDigitalSubtitle')}
        </p>

        <OrderDeliveryDetails order={lastOrder} onSaved={updateLastOrder} />

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
        <button className="btn btn-secondary" onClick={() => { onViewOrder(lastOrder.id); closeSuccess(); }}>
          {t('viewOrder')}
        </button>
      </div>
    </>
  );
}
