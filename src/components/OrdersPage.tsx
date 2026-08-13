import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { fetchOrders } from '../api';
import { formatCoins } from '../utils/currency';
import type { Order, OrderStatus } from '../types';
import Coin from './Coin';
import { CheckIcon } from './icons';
import './OrdersPage.scss';

const STATUS_KEY: Record<OrderStatus, string> = {
  paid: 'statusPaid',
  packed: 'statusPacked',
  ready: 'statusReady',
  collected: 'statusCollected',
};

const STATUS_ORDER: OrderStatus[] = ['paid', 'packed', 'ready', 'collected'];

export default function OrdersPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    fetchOrders().then((all) => {
      setOrders(all.filter((order) => order.userId === user.id || order.customerEmail === user.email).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLoading(false);
    });
  }, [user]);

  const locale = lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-GB';
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  if (loading || orders.length === 0) {
    return <div className="orders-page"><div className="orders-page__empty"><span aria-hidden="true">□</span><strong>{t('ordersEmpty')}</strong></div></div>;
  }

  const activeOrder = orders.find((order) => (order.status || 'paid') !== 'collected') || orders[0];
  const earlierOrders = orders.filter((order) => order.id !== activeOrder.id);
  const currentIndex = STATUS_ORDER.indexOf(activeOrder.status || 'paid');

  return (
    <div className="orders-page">
      <span className="orders-page__section-title">{t('orderProgress')}</span>
      <article className="active-order">
        <div className="active-order__head">
          <span><small>{t('orderNumber')}</small><strong>#{activeOrder.id.slice(0, 8).toUpperCase()}</strong></span>
          <b className={`active-order__status active-order__status--${activeOrder.status || 'paid'}`}>{t(STATUS_KEY[activeOrder.status || 'paid'])}</b>
        </div>

        <div className="active-order__product">
          <span className="active-order__image"><img src={activeOrder.items[0]?.product.image} alt="" /></span>
          <span><strong>{t(activeOrder.items[0]?.product.nameKey) || activeOrder.items[0]?.product.name}</strong><small>{activeOrder.items.length} {t('filterProducts')} · {formatCoins(activeOrder.totalPrice)} <Coin /></small></span>
        </div>

        <ol className="order-timeline">
          {STATUS_ORDER.map((status, index) => (
            <li className={index <= currentIndex ? 'order-timeline__step order-timeline__step--done' : 'order-timeline__step'} key={status}>
              <span>{index < currentIndex ? <CheckIcon /> : index + 1}</span>
              <small>{t(STATUS_KEY[status])}</small>
            </li>
          ))}
        </ol>

        {activeOrder.pickupCode && activeOrder.status !== 'collected' ? (
          <div className="active-order__pickup">
            <span><small>{t('orderPickupCode')}</small><strong>{activeOrder.pickupCode}</strong></span>
            <span><small>{t('pickupSlot')}</small><strong>{activeOrder.pickupSlot || '16:00–17:00 · MSI Campus'}</strong></span>
          </div>
        ) : null}
      </article>

      {earlierOrders.length > 0 ? (
        <section className="orders-page__earlier">
          <span className="orders-page__section-title">{t('earlier')}</span>
          {earlierOrders.map((order) => (
            <article className="past-order" key={order.id}>
              <span className="past-order__image"><img src={order.items[0]?.product.image} alt="" /></span>
              <span><strong>#{order.id.slice(0, 8).toUpperCase()}</strong><small>{formatDate(order.createdAt)} · {t(STATUS_KEY[order.status || 'paid'])}</small></span>
              <b>{formatCoins(order.totalPrice)} <Coin /></b>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
