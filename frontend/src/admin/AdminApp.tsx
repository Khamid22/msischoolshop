import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAdminBootstrap } from '../api';
import { BagIcon, BellIcon, BoxIcon, GridIcon, MoonIcon, StarIcon, SunIcon, UserIcon } from '../components/icons';
import type { AdminBootstrap } from '../types';
import { AnalyticsTab } from './AnalyticsTab';
import { CatalogTab } from './CatalogTab';
import { OrdersTab } from './OrdersTab';
import { StudentsTab } from './StudentsTab';

type Tab = 'overview' | 'catalog' | 'orders' | 'students' | 'banners' | 'news';
const TABS = [
  { id: 'overview', title: 'Аналитика продаж', short: 'Аналитика', icon: StarIcon, subtitle: 'MSI Coin, заказы и средний чек' },
  { id: 'catalog', title: 'Каталог товаров', short: 'Каталог', icon: GridIcon, subtitle: 'Digital и Physical · товары и категории' },
  { id: 'orders', title: 'История заказов', short: 'Заказы', icon: BoxIcon, subtitle: 'Покупки, активация и выдача по коду' },
  { id: 'students', title: 'Пользователи и MSI Coin', short: 'MSI Coin', icon: UserIcon, subtitle: 'Баланс пользователей и журнал операций' },
  { id: 'banners', title: 'Баннеры на главной', short: 'Баннеры', icon: BagIcon, subtitle: 'Карусель магазина и связанные товары' },
  { id: 'news', title: 'Новости', short: 'Новости', icon: BellIcon, subtitle: 'Публикации для учеников' },
] as const;

function initialTab(): Tab {
  const value = new URLSearchParams(location.search).get('tab');
  if (value === 'analytics') return 'overview';
  if (value === 'users') return 'students';
  return TABS.some((tab) => tab.id === value) ? value as Tab : 'catalog';
}

export function AdminApp() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<AdminBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('msi_admin_theme') || 'dark');
  const request = useRef(0);
  const embedded = new URLSearchParams(location.search).get('embedded') === '1';
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError('');
    try {
      const result = await fetchAdminBootstrap();
      if (id === request.current) { setData(result); setRevision((value) => value + 1); }
    } catch (failure) {
      if (id === request.current) setError(failure instanceof Error ? failure.message : 'Не удалось загрузить магазин.');
      throw failure;
    } finally { if (id === request.current) setLoading(false); }
  }, []);
  useEffect(() => { void load().catch(() => {}); }, [load]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('msi_admin_theme', theme); }, [theme]);
  useEffect(() => { const onPop = () => setTab(initialTab()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  const navigate = (next: Tab) => {
    const url = new URL(location.href); url.searchParams.set('tab', next);
    history.pushState({}, '', url); setTab(next);
  };
  const active = TABS.find((item) => item.id === tab)!;
  const counts = data ? { catalog: data.products.length, orders: data.orders.length, students: data.users.length, banners: data.banners.length, news: data.news.length, overview: null } : null;
  return <div className={`admin-shell ${embedded ? 'is-embedded' : ''}`}>
    <aside className="admin-sidebar">
      <div className="admin-brand"><strong>MSI</strong><span>Панель администратора</span></div>
      <nav className="admin-nav" aria-label="Разделы магазина">{TABS.map(({ id, title, short, icon: Icon }) => <button key={id} title={title} className={id === tab ? 'is-active' : ''} aria-current={id === tab ? 'page' : undefined} onClick={() => navigate(id)}><Icon /><span className="desktop-label">{title}</span><span className="mobile-label">{short}</span>{counts?.[id] != null ? <small>{counts[id]}</small> : null}</button>)}</nav>
    </aside>
    <main className="admin-main"><header className="admin-header"><div><h1>{active.title}</h1><p>{active.subtitle}</p></div><button className="icon-button" aria-label="Ночной режим" aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Выключить ночной режим' : 'Включить ночной режим'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <MoonIcon /> : <SunIcon />}</button></header>
      <div className="admin-content" aria-busy={loading}>
        {error ? <div className="inline-error" role="alert"><p>{error}</p><button className="button" onClick={() => void load().catch(() => {})}>Повторить</button>{!data ? <a className="button" href="./admin-login.html">Войти</a> : null}</div> : null}
        {!data && loading ? <div className="admin-state" role="status"><span className="spinner" /><p>Загружаем магазин…</p></div> : null}
        {data ? <>
          {tab === 'overview' ? <AnalyticsTab revision={revision} /> : null}
          {tab === 'catalog' || tab === 'banners' || tab === 'news' ? <CatalogTab key={tab} section={tab === 'catalog' ? 'products' : tab} data={data} refresh={load} /> : null}
          {tab === 'orders' ? <OrdersTab orders={data.orders} refresh={load} /> : null}
          {tab === 'students' ? <StudentsTab data={data} refresh={load} /> : null}
        </> : null}
      </div>
    </main>
  </div>;
}
