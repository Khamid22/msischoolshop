import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { ApiError, clearUserSession, fetchOrders } from '../api';
import { formatCoins } from '../utils/currency';
import type { FulfillmentType, Order, OrderStatus, View } from '../types';
import Coin from './Coin';
import { CheckIcon } from './icons';
import OrderDeliveryDetails from './OrderDeliveryDetails';
import ProfilePage from './ProfilePage';
import './OrdersPage.scss';

const STATUS_KEY: Record<OrderStatus, string> = {
  paid: 'statusPaid',
  packed: 'statusPacked',
  ready: 'statusReady',
  collected: 'statusCollected',
  activating: 'statusActivating',
  connected: 'statusConnected',
  sent: 'statusSent',
  received: 'statusReceived',
};

const STATUS_ORDER: Record<FulfillmentType, OrderStatus[]> = {
  physical_pickup: ['paid', 'packed', 'ready', 'collected'],
  digital_activation: ['paid', 'activating', 'connected'],
  digital_delivery: ['paid', 'sent', 'received'],
};

function fulfillmentType(order: Order): FulfillmentType {
  if (order.fulfillmentType) return order.fulfillmentType;
  return order.items[0]?.product.type === 'physical' ? 'physical_pickup' : 'digital_activation';
}

function statusFlow(order: Order): OrderStatus[] {
  return order.statusFlow?.length ? order.statusFlow : STATUS_ORDER[fulfillmentType(order)];
}

function isComplete(order: Order): boolean {
  const flow = statusFlow(order);
  return (order.status || 'paid') === flow[flow.length - 1];
}

export default function OrdersPage({ selectedOrderId, onNavigate, onSelect }: {
  selectedOrderId: string | null;
  onNavigate: (view: View) => void;
  onSelect: (orderId: string) => void;
}) {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLang();
  const [result, setResult] = useState<{ userId: string; orders: Order[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setResult(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetchOrders(controller.signal)
      .then((all) => {
        if (!controller.signal.aborted) setResult({ userId, orders: all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setError(true);
        if (failure instanceof ApiError && failure.status === 401) {
          clearUserSession();
          void refreshUser();
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [userId, attempt, refreshUser]);

  const orders = result && result.userId === userId ? result.orders : [];
  const updateOrder = (updated: Order) => setResult((current) => current && current.userId === updated.userId
    ? { ...current, orders: current.orders.map((order) => order.id === updated.id ? updated : order) }
    : current);
  const statusLabel = (order: Order) => t(order.informationRequired ? 'deliveryDetailsRequired'
    : order.status === 'paid' && order.deliveryRequirements?.length ? 'deliveryDetailsAwaitingDelivery'
      : STATUS_KEY[order.status || 'paid']);

  const locale = lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-GB';
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  if (!user) return <><p className="orders-page__signin">{t('deliveryDetailsSignIn')}</p><ProfilePage onNavigate={onNavigate} /></>;
  if (error) return <div className="orders-page__empty"><p role="alert">{t('ordersLoadError')}</p><button className="btn btn-secondary" onClick={() => setAttempt((value) => value + 1)}>{t('deliveryRetry')}</button></div>;
  if (loading || result?.userId !== userId) return <div className="orders-page__empty" role="status">{t('ordersLoading')}</div>;
  if (orders.length === 0) {
    return <div className="orders-page"><div className="orders-page__empty"><span aria-hidden="true">□</span><strong>{t('ordersEmpty')}</strong></div></div>;
  }

  const requestedOrder = orders.find((order) => order.id === selectedOrderId);
  const activeOrder = requestedOrder || orders.find((order) => order.informationRequired) || orders.find((order) => !isComplete(order)) || orders[0];
  const earlierOrders = orders.filter((order) => order.id !== activeOrder.id);
  const activeFlow = statusFlow(activeOrder);
  const currentIndex = Math.max(0, activeFlow.indexOf(activeOrder.status || 'paid'));

  return (
    <div className="orders-page">
      {selectedOrderId && !requestedOrder && <p role="status">{t('orderUnavailable')}</p>}
      <span className="orders-page__section-title">{t('orderProgress')}</span>
      <article className="active-order">
        <div className="active-order__head">
          <span><small>{t('orderNumber')}</small><strong>#{activeOrder.id.slice(0, 8).toUpperCase()}</strong></span>
          <b className={`active-order__status active-order__status--${activeOrder.status || 'paid'}`} role="status">{statusLabel(activeOrder)}</b>
        </div>

        <div className="active-order__product">
          <span className="active-order__image"><img src={activeOrder.items[0]?.product.image} alt="" /></span>
          <span><strong>{activeOrder.items[0]?.variant?.label || activeOrder.items[0]?.product.name || t(activeOrder.items[0]?.product.nameKey)}</strong><small>{t('quantity')}: {activeOrder.items[0]?.quantity} · {formatCoins(activeOrder.totalPrice)} <Coin /></small></span>
        </div>

        <ol className="order-timeline">
          {activeFlow.map((status, index) => (
            <li className={index <= currentIndex ? 'order-timeline__step order-timeline__step--done' : 'order-timeline__step'} key={status}>
              <span>{index < currentIndex ? <CheckIcon /> : index + 1}</span>
              <small>{t(STATUS_KEY[status])}</small>
            </li>
          ))}
        </ol>

        <OrderDeliveryDetails key={`${userId}:${activeOrder.id}`} order={activeOrder} onSaved={updateOrder} />

        {fulfillmentType(activeOrder) === 'physical_pickup' && activeOrder.pickupCode && !isComplete(activeOrder) ? (
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
            <button type="button" className="past-order" key={order.id} onClick={() => onSelect(order.id)}>
              <span className="past-order__image"><img src={order.items[0]?.product.image} alt="" /></span>
              <span><strong>#{order.id.slice(0, 8).toUpperCase()} · {order.items[0]?.variant?.label || order.items[0]?.product.name}</strong><small>{formatDate(order.createdAt)} · {statusLabel(order)}</small></span>
              <b>{formatCoins(order.totalPrice)} <Coin /></b>
            </button>
          ))}
        </section>
      ) : null}
    </div>
  );
}
