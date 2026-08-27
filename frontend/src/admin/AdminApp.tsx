import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ApiError, changeAdminUserBalance, createProduct, deleteProduct,
  fetchAdminBootstrap, isAuthenticated, updateAdminOrderStatus, updateProduct,
} from '../api';
import {
  BagIcon, BoxIcon, GridIcon, PlusIcon, SearchIcon, TrashIcon, UserIcon, XIcon,
} from '../components/icons';
import type { AdminBootstrap, FulfillmentType, Order, OrderStatus, Product, User } from '../types';

type AdminTab = 'overview' | 'products' | 'orders' | 'students';
const EMPTY_DATA: AdminBootstrap = { products: [], banners: [], news: [], orders: [], users: [], notifications: [], grants: [] };
const TAB_LABELS: Record<AdminTab, string> = { overview: 'Обзор', products: 'Товары', orders: 'Покупки', students: 'Ученики и коины' };
const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Оплачен', packed: 'Собран', ready: 'Готов к выдаче', collected: 'Выдан',
  activating: 'Активация', connected: 'Подключён', sent: 'Отправлен', received: 'Получен',
};
const ACTION_LABELS: Record<OrderStatus, string> = {
  paid: 'Вернуть в оплаченные', packed: 'Отметить собранным', ready: 'Отметить готовым',
  collected: 'Отметить выданным', activating: 'Начать активацию', connected: 'Отметить подключённым',
  sent: 'Отметить отправленным', received: 'Подтвердить получение',
};
const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  physical_pickup: 'Физический · выдача', digital_activation: 'Цифровой · активация', digital_delivery: 'Цифровой · отправка',
};
const TABS: Array<{ id: AdminTab; icon: typeof GridIcon }> = [
  { id: 'overview', icon: GridIcon }, { id: 'products', icon: BoxIcon },
  { id: 'orders', icon: BagIcon }, { id: 'students', icon: UserIcon },
];

const formatCoins = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
const productTitle = (product?: Product) => product?.name || product?.nameKey || 'Товар';
const orderTitle = (order: Order) => order.items.map((item) => productTitle(item.product)).join(', ') || 'Покупка';
const fulfillmentOf = (product: Product): FulfillmentType => product.fulfillmentType || (product.type === 'physical' ? 'physical_pickup' : 'digital_activation');
function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, hourCycle: 'h23',
  }).format(date);
}

function useAdminTab(): [AdminTab, (tab: AdminTab) => void] {
  const current = new URLSearchParams(window.location.search).get('tab');
  const [tab, setState] = useState<AdminTab>(current && current in TAB_LABELS ? current as AdminTab : 'overview');
  return [tab, (next) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState({}, '', url);
    setState(next);
  }];
}

function LoadingState() {
  return <section className="admin-state" aria-live="polite"><span className="spinner" /><h1>Загружаем магазин…</h1><p>Получаем товары, покупки и балансы учеников.</p></section>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <section className="admin-state" role="alert"><div className="admin-state__icon"><XIcon /></div><h1>Не удалось открыть MSI Shop</h1><p>{message}</p><button className="button button--primary" type="button" onClick={retry}>Повторить</button></section>;
}

function StatCard({ tone, label, value, caption }: { tone: string; label: string; value: string; caption: string }) {
  return <article className={`stat-card stat-card--${tone}`}><span className="stat-card__mark" /><div><p>{label}</p><strong>{value}</strong><small>{caption}</small></div></article>;
}

function Overview({ data, navigate }: { data: AdminBootstrap; navigate: (tab: AdminTab) => void }) {
  const metrics = useMemo(() => ({
    active: data.products.filter((item) => item.active !== false).length,
    pending: data.orders.filter((item) => item.nextStatus).length,
    spent: data.orders.reduce((sum, item) => sum + item.totalPrice, 0),
    balances: data.users.reduce((sum, item) => sum + item.balance, 0),
  }), [data]);
  return <div className="page-stack">
    <header className="section-heading"><div><h1>Магазин сегодня</h1><p>Короткая сводка без лишних графиков.</p></div><button className="button" type="button" onClick={() => navigate('orders')}>Все покупки</button></header>
    <div className="stats-grid">
      <StatCard tone="navy" label="Продано" value={`${formatCoins(metrics.spent)} коинов`} caption={`${data.orders.length} покупок всего`} />
      <StatCard tone="amber" label="Требуют действия" value={String(metrics.pending)} caption="Выдать, отправить или подключить" />
      <StatCard tone="green" label="Активные товары" value={String(metrics.active)} caption={`${data.products.length} товаров в базе`} />
      <StatCard tone="violet" label="У учеников" value={`${formatCoins(metrics.balances)} коинов`} caption={`${data.users.length} учеников`} />
    </div>
    <section className="panel"><div className="panel__heading"><div><h2>Последние покупки</h2><p>Статус и правильный процесс товара.</p></div></div><OrdersTable orders={data.orders.slice(0, 6)} compact /></section>
  </div>;
}

function ProductModal({ product, close, saved }: { product?: Product; close: () => void; saved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fulfillmentType = String(form.get('fulfillmentType')) as FulfillmentType;
    const name = String(form.get('name') || '').trim();
    const description = String(form.get('description') || '').trim();
    const payload: Omit<Product, 'id'> = {
      nameKey: name, descKey: description, name, description,
      image: String(form.get('image') || '').trim(), price: Number(form.get('price') || 0),
      stock: fulfillmentType === 'physical_pickup' ? Number(form.get('stock') || 0) : undefined,
      type: fulfillmentType === 'physical_pickup' ? 'physical' : 'digital', fulfillmentType,
      active: form.get('active') === 'on',
    };
    setBusy(true); setError('');
    try {
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload);
      saved();
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить товар'); }
    finally { setBusy(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <header className="modal__header"><div><h2 id="product-modal-title">{product ? 'Изменить товар' : 'Новый товар'}</h2><p>Тип товара определяет действие после оплаты.</p></div><button className="icon-button" type="button" onClick={close} aria-label="Закрыть"><XIcon /></button></header>
      <form onSubmit={submit}><div className="modal__body form-grid">
        <label className="field field--wide"><span>Название</span><input name="name" defaultValue={product?.name || product?.nameKey} required /></label>
        <label className="field"><span>Цена в коинах</span><input name="price" type="number" min="0" defaultValue={product?.price || 0} required /></label>
        <label className="field"><span>Процесс</span><select name="fulfillmentType" defaultValue={product ? fulfillmentOf(product) : 'digital_activation'}><option value="digital_activation">Цифровой — подключить</option><option value="digital_delivery">Цифровой — отправить</option><option value="physical_pickup">Физический — выдать</option></select></label>
        <label className="field field--wide"><span>Описание</span><textarea name="description" rows={3} defaultValue={product?.description || product?.descKey} /></label>
        <label className="field field--wide"><span>Ссылка на изображение</span><input name="image" type="url" defaultValue={product?.image} required /></label>
        <label className="field"><span>Остаток физического товара</span><input name="stock" type="number" min="0" defaultValue={product?.stock || 0} /></label>
        <label className="check-field"><input name="active" type="checkbox" defaultChecked={product?.active !== false} /><span>Показывать в магазине</span></label>
        {error && <p className="form-error field--wide" role="alert">{error}</p>}
      </div><footer className="modal__footer"><button className="button" type="button" onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button></footer></form>
    </section>
  </div>;
}

function ProductsTab({ products, refresh }: { products: Product[]; refresh: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [busyId, setBusyId] = useState('');
  const filtered = products.filter((item) => `${productTitle(item)} ${item.description || ''}`.toLowerCase().includes(search.toLowerCase()));
  const toggle = async (product: Product) => { setBusyId(product.id); try { await updateProduct(product.id, { active: product.active === false }); await refresh(); } finally { setBusyId(''); } };
  const remove = async (product: Product) => {
    if (!window.confirm(`Удалить товар «${productTitle(product)}»? Это действие нельзя отменить.`)) return;
    setBusyId(product.id); try { await deleteProduct(product.id); await refresh(); } finally { setBusyId(''); }
  };
  return <div className="page-stack">
    <header className="section-heading"><div><h1>Товары</h1><p>Что видит ученик и что делать после покупки.</p></div><button className="button button--primary" type="button" onClick={() => setEditing('new')}><PlusIcon /> Новый товар</button></header>
    <section className="panel"><div className="table-toolbar"><label className="search-field"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск товара" /></label><span>{filtered.length} товаров</span></div>
      <div className="table-scroll"><table><thead><tr><th>Товар</th><th>Цена</th><th>Процесс</th><th>Остаток</th><th>Статус</th><th /></tr></thead><tbody>
        {filtered.map((product) => <tr key={product.id}><td><div className="product-cell"><img src={product.image} alt="" /><div><strong>{productTitle(product)}</strong><small>{product.description || product.descKey || 'Без описания'}</small></div></div></td><td><strong>{formatCoins(product.price)}</strong> <small>коинов</small></td><td><span className={`type-badge type-badge--${fulfillmentOf(product)}`}>{FULFILLMENT_LABELS[fulfillmentOf(product)]}</span></td><td>{fulfillmentOf(product) === 'physical_pickup' ? product.stock ?? 0 : '—'}</td><td><button className={`status-toggle ${product.active === false ? '' : 'is-active'}`} type="button" disabled={busyId === product.id} onClick={() => void toggle(product)}>{product.active === false ? 'Скрыт' : 'Активен'}</button></td><td><div className="row-actions"><button className="button button--small" type="button" onClick={() => setEditing(product)}>Изменить</button><button className="icon-button icon-button--danger" type="button" onClick={() => void remove(product)} aria-label={`Удалить ${productTitle(product)}`}><TrashIcon /></button></div></td></tr>)}
        {!filtered.length && <tr><td colSpan={6}><div className="empty-row">Товары не найдены</div></td></tr>}
      </tbody></table></div>
    </section>
    {editing && <ProductModal product={editing === 'new' ? undefined : editing} close={() => setEditing(null)} saved={() => { setEditing(null); void refresh(); }} />}
  </div>;
}

function OrdersTable({ orders, compact, advance }: { orders: Order[]; compact?: boolean; advance?: (order: Order) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Покупка</th><th>Ученик</th><th>Стоимость</th><th>Процесс</th><th>Статус</th>{!compact && <th>Действие</th>}</tr></thead><tbody>
    {orders.map((order) => <tr key={order.id}><td><strong>{orderTitle(order)}</strong><small className="cell-subline">{order.id.slice(0, 10)} · {formatDate(order.createdAt)}</small></td><td>{order.customerName || order.customerEmail || '—'}</td><td><strong>{formatCoins(order.totalPrice)}</strong> <small>коинов</small></td><td><span className={`type-badge type-badge--${order.fulfillmentType || 'physical_pickup'}`}>{FULFILLMENT_LABELS[order.fulfillmentType || 'physical_pickup']}</span></td><td><span className={`order-status order-status--${order.status || 'paid'}`}>{STATUS_LABELS[order.status || 'paid']}</span></td>{!compact && <td>{order.nextStatus && advance ? <button className="button button--small button--primary" type="button" onClick={() => advance(order)}>{ACTION_LABELS[order.nextStatus]}</button> : <span className="done-label">Готово</span>}</td>}</tr>)}
    {!orders.length && <tr><td colSpan={compact ? 5 : 6}><div className="empty-row">Покупок пока нет</div></td></tr>}
  </tbody></table></div>;
}

function OrdersTab({ orders, refresh }: { orders: Order[]; refresh: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'all' | 'action' | 'done'>('all');
  const [busyId, setBusyId] = useState('');
  const filtered = orders.filter((order) => `${orderTitle(order)} ${order.customerName} ${order.id}`.toLowerCase().includes(search.toLowerCase()) && (state === 'all' || (state === 'action' ? Boolean(order.nextStatus) : !order.nextStatus)));
  const advance = async (order: Order) => { if (!order.nextStatus || busyId) return; setBusyId(order.id); try { await updateAdminOrderStatus(order.id, order.nextStatus); await refresh(); } finally { setBusyId(''); } };
  return <div className="page-stack"><header className="section-heading"><div><h1>Покупки</h1><p>Физические товары выдаём, цифровые — подключаем или отправляем.</p></div></header><section className="panel">
    <div className="table-toolbar"><label className="search-field"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ученик, товар или номер" /></label><div className="segmented"><button className={state === 'all' ? 'is-active' : ''} onClick={() => setState('all')} type="button">Все</button><button className={state === 'action' ? 'is-active' : ''} onClick={() => setState('action')} type="button">Нужно действие</button><button className={state === 'done' ? 'is-active' : ''} onClick={() => setState('done')} type="button">Завершено</button></div></div>
    <OrdersTable orders={filtered} advance={(order) => void advance(order)} />
  </section></div>;
}

function BalanceModal({ user, close, saved }: { user: User; close: () => void; saved: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(''); try { await changeAdminUserBalance(user.id, Number(form.get('amount')), String(form.get('reason') || '').trim()); saved(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Не удалось изменить баланс'); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal modal--small" role="dialog" aria-modal="true" aria-labelledby="balance-title"><header className="modal__header"><div><h2 id="balance-title">Баланс ученика</h2><p>{user.name} · сейчас {formatCoins(user.balance)} коинов</p></div><button className="icon-button" type="button" onClick={close} aria-label="Закрыть"><XIcon /></button></header><form onSubmit={submit}><div className="modal__body form-grid"><label className="field"><span>Изменение</span><input name="amount" type="number" placeholder="+100 или −100" required /></label><label className="field field--wide"><span>Причина</span><input name="reason" placeholder="Например: награда за олимпиаду" required /></label>{error && <p className="form-error field--wide">{error}</p>}</div><footer className="modal__footer"><button className="button" type="button" onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Применить'}</button></footer></form></section></div>;
}

function StudentsTab({ data, refresh }: { data: AdminBootstrap; refresh: () => Promise<void> }) {
  const [search, setSearch] = useState(''); const [editing, setEditing] = useState<User | null>(null);
  const filtered = data.users.filter((user) => `${user.name} ${user.studentId || ''} ${user.group || ''}`.toLowerCase().includes(search.toLowerCase()));
  const grants = [...data.grants].reverse().slice(0, 8);
  return <div className="page-stack"><header className="section-heading"><div><h1>Ученики и коины</h1><p>Текущий баланс и прозрачная история изменений.</p></div></header><div className="split-panels">
    <section className="panel"><div className="table-toolbar"><label className="search-field"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, ID или группа" /></label><span>{filtered.length} учеников</span></div><div className="table-scroll"><table><thead><tr><th>Ученик</th><th>Группа</th><th>Баланс</th><th /></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small className="cell-subline">{user.studentId || user.email}</small></td><td>{user.group || '—'}</td><td><strong className="coin-value">{formatCoins(user.balance)}</strong></td><td><button className="button button--small" type="button" onClick={() => setEditing(user)}>Изменить</button></td></tr>)}{!filtered.length && <tr><td colSpan={4}><div className="empty-row">Ученики не найдены</div></td></tr>}</tbody></table></div></section>
    <section className="panel history-panel"><div className="panel__heading"><div><h2>Последние изменения</h2><p>Кто и сколько начислил или списал.</p></div></div><div className="history-list">{grants.map((grant) => <article key={grant.id}><span className={grant.amount >= 0 ? 'history-plus' : 'history-minus'}>{grant.amount >= 0 ? '+' : ''}{formatCoins(grant.amount)}</span><div><strong>{grant.userName}</strong><small>{grant.type || 'Изменение'} · {formatDate(grant.createdAt)}</small></div></article>)}{!grants.length && <div className="empty-row">История пока пуста</div>}</div></section>
  </div>{editing && <BalanceModal user={editing} close={() => setEditing(null)} saved={() => { setEditing(null); void refresh(); }} />}</div>;
}

export function AdminApp() {
  const [tab, setTab] = useAdminTab(); const [data, setData] = useState(EMPTY_DATA); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const embedded = new URLSearchParams(window.location.search).get('embedded') === '1';
  const load = useCallback(async () => { setLoading(true); setError(''); try { if (!await isAuthenticated()) throw new ApiError(401, 'Сессия Customer Support закончилась. Вернитесь в портал и снова откройте «Магазин».'); setData(await fetchAdminBootstrap()); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Неизвестная ошибка'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  const actionCount = data.orders.filter((order) => order.nextStatus).length;
  return <main className={`admin-shell ${embedded ? 'is-embedded' : ''}`}>
    {!embedded && <header className="admin-topbar"><div><span className="brand-mark">MSI</span><div><strong>MSI Shop</strong><small>Панель Customer Support</small></div></div><button className="button" type="button" onClick={() => void load()}>Обновить</button></header>}
    <nav className="admin-tabs" aria-label="Разделы магазина">{TABS.map(({ id, icon: Icon }) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon /><span>{TAB_LABELS[id]}</span>{id === 'orders' && actionCount > 0 && <b>{actionCount}</b>}</button>)}</nav>
    <div className="admin-content">{tab === 'overview' && <Overview data={data} navigate={setTab} />}{tab === 'products' && <ProductsTab products={data.products} refresh={load} />}{tab === 'orders' && <OrdersTab orders={data.orders} refresh={load} />}{tab === 'students' && <StudentsTab data={data} refresh={load} />}</div>
  </main>;
}
