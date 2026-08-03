import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { fetchOrders } from '../api';
import { formatCoins } from '../utils/currency';
import type { Order, OrderStatus } from '../types';
import Coin from './Coin';
import './OrdersPage.scss';

const STATUS_KEY: Record<OrderStatus, string> = {
  paid: 'statusPaid',
  packed: 'statusPacked',
  ready: 'statusReady',
  collected: 'statusCollected',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    fetchOrders().then((all) => {
      setOrders(
        all
          .filter((o) => o.userId === user.id || o.customerEmail === user.email)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return (
      <div className="orders-page">
        <div className="orders-page__empty">{t('ordersEmpty')}</div>
      </div>
    );
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="orders-page">
      {loading ? (
        <div className="orders-page__empty">{t('ordersEmpty')}</div>
      ) : orders.length === 0 ? (
        <div className="orders-page__empty">{t('ordersEmpty')}</div>
      ) : (
        <ul className="orders-page__list">
          {orders.map((o) => (
            <li key={o.id} className="order-card card elev-sm">
              <div className="order-card__head">
                <span className="order-card__num">
                  {t('orderNumber')}: {o.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="order-card__date">{formatDate(o.createdAt)}</span>
              </div>

              <ul className="order-card__items">
                {o.items.map((it) => (
                  <li key={it.product.id} className="order-card__item">
                    <span>{t(it.product.nameKey) || it.product.name}</span>
                    <span>× {it.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="order-card__foot">
                <span className={`order-card__status order-card__status--${o.status || 'paid'}`}>
                  {t(STATUS_KEY[o.status || 'paid'])}
                </span>
                <span className="order-card__total">
                  {formatCoins(o.totalPrice)} <Coin />
                </span>
              </div>

              {o.pickupCode && o.status !== 'collected' && (
                <div className="order-card__code">
                  <span className="order-card__code-label">{t('orderPickupCode')}</span>
                  <span className="order-card__code-value">{o.pickupCode}</span>
                  {o.pickupSlot && <span className="order-card__code-slot">{o.pickupSlot}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
