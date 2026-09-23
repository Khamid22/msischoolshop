import { useState } from 'react';
import { updateAdminOrderStatus } from '../api';
import { SearchIcon } from '../components/icons';
import type { Order, OrderStatus } from '../types';
import { ACTION_LABELS, STATUS_LABELS, deliveryAnswerLines, downloadCsv, formatCoins, formatDate, orderNeedsAction, orderStatusLabel, orderTitle } from './presentation';

export function OrdersTab({ orders, refresh }: { orders: Order[]; refresh: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const filtered = orders.filter((order) => `${orderTitle(order)} ${order.customerName} ${order.customerPhone} ${order.id} ${order.pickupCode || ''}`.toLowerCase().includes(search.toLowerCase())
    && (status === 'all' || order.status === status || (status === 'action' && orderNeedsAction(order))
      || (status === 'information_required' && order.informationRequired)));
  async function advance(order: Order) {
    if (!order.nextStatus || busyId) return;
    setBusyId(order.id); setError('');
    try { await updateAdminOrderStatus(order.id, order.nextStatus); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось обновить статус.'); }
    finally { setBusyId(''); }
  }
  return <div className="page-stack">
    <div className="section-actions"><span className="muted">Показано {filtered.length} из {orders.length} заказов</span><button className="button button--primary" onClick={() => downloadCsv('shop-orders.csv', [
      ['Заказ', 'Дата', 'Клиент', 'Телефон', 'Товары', 'Статус', 'MSI Coin', 'Код выдачи', 'Данные для выдачи'],
      ...filtered.map((order) => [order.id, formatDate(order.createdAt), order.customerName, order.customerPhone, orderTitle(order), orderStatusLabel(order), order.totalPrice, order.pickupCode || '', (order.deliveryRequirements || []).flatMap(deliveryAnswerLines).join('; ')]),
    ])}>↓ Экспорт CSV</button></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    <div className="panel table-toolbar"><label className="search-field"><SearchIcon /><input aria-label="Поиск заказов" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Клиент, товар, номер или код выдачи…" /></label><label className="filter-field"><span>Статус</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Все статусы</option><option value="action">Требуют действия</option><option value="information_required">Нужны данные</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <section className="panel"><div className="table-scroll"><table className="responsive-table orders-table"><thead><tr><th>Дата</th><th>Клиент</th><th>Товары</th><th>Статус</th><th className="numeric">Сумма</th><th>Действия</th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}>
      <td data-label="Дата"><strong>{formatDate(order.createdAt)}</strong><small className="cell-subline">№ {order.id.slice(0, 12)}</small></td>
      <td data-label="Клиент"><strong>{order.customerName || '—'}</strong><small className="cell-subline">{order.customerPhone || order.customerEmail}</small></td>
      <td data-label="Товары">{orderTitle(order)}{order.pickupCode ? <small className="cell-subline pickup-code">Код: {order.pickupCode}</small> : null}{order.pickupSlot ? <small className="cell-subline">{order.pickupSlot}</small> : null}
        {order.deliveryRequirements?.map((requirement) => <div className="order-delivery-info" key={requirement.itemIndex}>
          {deliveryAnswerLines(requirement).map((line, index) => <strong className="cell-subline" key={index}>{line}</strong>)}
          <small className="cell-subline">{requirement.submittedAt ? `Ученик отправил ${formatDate(requirement.submittedAt)}` : 'Ожидаем данные от ученика'}</small>
        </div>)}
      </td>
      <td data-label="Статус"><span className={`order-status order-status--${order.status}`}>{orderStatusLabel(order)}</span></td>
      <td data-label="Сумма" className="numeric">Ⓒ {formatCoins(order.totalPrice)}</td>
      <td className="actions-cell">{order.informationRequired ? <span className="muted">Ожидаем данные</span> : order.nextStatus ? <button className="button button--small button--primary" disabled={Boolean(busyId)} onClick={() => void advance(order)}>{busyId === order.id ? 'Сохраняем…' : ACTION_LABELS[order.nextStatus as OrderStatus]}</button> : <span className="done-label">✓ Завершён</span>}</td>
    </tr>)}</tbody></table></div>{!filtered.length ? <div className="empty-row">Заказы не найдены</div> : null}</section>
  </div>;
}
