import { useCart } from '../contexts/CartContext';
import './OrderSuccess.scss';

export default function OrderSuccess() {
  const { lastOrder, closeSuccess } = useCart();

  if (!lastOrder) return null;

  return (
    <>
      <div className="success-overlay" onClick={closeSuccess} />
      <div className="success-modal">
        <div className="success-modal__icon">✓</div>
        <h2 className="success-modal__title">
          Спасибо за заказ, {lastOrder.customerName}!
        </h2>
        <p className="success-modal__subtitle">
          Мы свяжемся с вами по номеру {lastOrder.customerPhone}.
        </p>
        <p className="success-modal__sum">
          Сумма заказа: {lastOrder.totalPrice} сум.
        </p>
        <button className="success-modal__btn" onClick={closeSuccess}>
          Закрыть
        </button>
      </div>
    </>
  );
}
