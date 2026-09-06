import { useEffect, useState } from 'react';
import { fetchAdminAnalytics } from '../api';
import type { SalesAnalytics } from '../types';
import { downloadCsv, formatCoins } from './presentation';

const COLORS = ['#968ae0', '#5d5294', '#d2cefd', '#595d6c', '#b5abfc', '#796cbf'];

export function AnalyticsTab({ revision }: { revision: number }) {
  const [range, setRange] = useState<'7' | '30' | 'all'>('all');
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let ignore = false;
    setBusy(true); setError('');
    fetchAdminAnalytics(range).then((result) => { if (!ignore) setData(result); })
      .catch((failure: Error) => { if (!ignore) setError(failure.message); })
      .finally(() => { if (!ignore) setBusy(false); });
    return () => { ignore = true; };
  }, [range, revision, attempt]);
  const exportData = () => data && downloadCsv('shop-analytics.csv', [
    ['Период', 'MSI Coin'], ...data.periods.map((point) => [point.label, point.amount]),
    [], ['Товар', 'MSI Coin'], ...data.products.map((point) => [point.label, point.amount]),
  ]);
  const maximum = Math.max(1, ...data?.periods.map((point) => point.amount) || []);
  let offset = 0;
  return <div className="page-stack" aria-busy={busy}>
    <div className="section-actions"><div className="segmented" aria-label="Период аналитики">{(['7', '30', 'all'] as const).map((value) => <button type="button" key={value} aria-pressed={range === value} className={range === value ? 'is-active' : ''} onClick={() => setRange(value)}>{value === 'all' ? 'Всё время' : `${value} дней`}</button>)}</div><button className="button button--primary" disabled={!data || busy || Boolean(error)} onClick={exportData}>↓ Экспорт CSV</button></div>
    {error ? <div className="inline-error" role="alert">{error}<button className="button" onClick={() => setAttempt((value) => value + 1)}>Повторить</button></div> : null}
    {busy ? <p role="status" className="muted">Обновляем аналитику…</p> : null}
    {data ? <>
      <div className="stats-grid">{[
        ['Потрачено MSI Coin', `Ⓒ ${formatCoins(data.totalCoins)}`], ['Заказов', formatCoins(data.orderCount)],
        ['Средний чек', `Ⓒ ${formatCoins(data.averageOrder)}`], ['Товаров продано', formatCoins(data.unitsSold)],
      ].map(([label, value]) => <article className="stat-card" key={label}><p>{label}</p><strong>{value}</strong><small>{range === 'all' ? 'за всё время' : `за ${range} дней`}</small></article>)}</div>
      <div className="analytics-charts">
        <section className="panel chart-panel"><h2>Потрачено MSI Coin по товарам</h2>{data.products.length ? <div className="donut-layout"><svg viewBox="0 0 42 42" role="img" aria-label={`По товарам: ${formatCoins(data.totalCoins)} MSI Coin`}><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--admin-border)" strokeWidth="6" />{data.products.map((point, index) => {
          const fraction = data.totalCoins ? point.amount / data.totalCoins * 100 : 0;
          const current = offset; offset += fraction;
          return <circle key={point.label} cx="21" cy="21" r="15.9155" fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="6" strokeDasharray={`${fraction} ${100 - fraction}`} strokeDashoffset={-current} transform="rotate(-90 21 21)" />;
        })}</svg><ul className="chart-legend">{data.products.map((point, index) => <li key={point.label}><i style={{ background: COLORS[index % COLORS.length] }} /><span>{point.label}</span><b>Ⓒ {formatCoins(point.amount)}</b></li>)}</ul></div> : <div className="empty-row">Продаж пока нет</div>}</section>
        <section className="panel chart-panel"><h2>Потрачено MSI Coin по периодам</h2><div className="bar-chart" role="list" aria-label="Продажи по периодам">{data.periods.map((point) => <div className="bar-chart__point" role="listitem" key={point.label} title={`${point.label}: ${formatCoins(point.amount)} MSI Coin`}><span>{formatCoins(point.amount)}</span><i style={{ height: `${Math.max(2, point.amount / maximum * 150)}px`, background: point.amount === maximum ? COLORS[0] : COLORS[1] }} /><small>{point.label.split('-').slice(1).reverse().join('.')}</small></div>)}</div>{!data.periods.length ? <div className="empty-row">Продаж пока нет</div> : null}</section>
      </div>
    </> : null}
  </div>;
}
