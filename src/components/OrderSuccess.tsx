import { useCart } from '../contexts/CartContext';
import { useLang } from '../contexts/LangContext';
import './OrderSuccess.scss';

export default function OrderSuccess() {
  const { lastOrder, closeSuccess } = useCart();
  const { t } = useLang();

  if (!lastOrder) return null;

  return (
    <>
      <div className="success-overlay" onClick={closeSuccess} />
      <div className="success-modal">
        <div className="success-modal__icon">✓</div>
        <h2 className="success-modal__title">
          {t('orderSuccessTitle')}, {lastOrder.customerName}!
        </h2>
        <p className="success-modal__subtitle">
          {t('orderSuccessSubtitle')} {lastOrder.customerPhone}.
        </p>
        <p className="success-modal__sum">
          {t('orderSuccessSum')} {lastOrder.totalPrice} ⭐.
        </p>
        <button className="success-modal__btn" onClick={closeSuccess}>
          {t('close')}
        </button>
      </div>
    </>
  );
}
