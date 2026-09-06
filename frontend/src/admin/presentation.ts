import type { Order, OrderStatus, Product } from '../types';
export { formatCoins } from '../utils/currency';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Оплачен', packed: 'Собран', ready: 'Готов к выдаче', collected: 'Выдан',
  activating: 'Активация', connected: 'Подключён', sent: 'Отправлен', received: 'Получен',
};
export const ACTION_LABELS: Record<OrderStatus, string> = {
  paid: 'В оплаченные', packed: 'Собрать', ready: 'Готов к выдаче', collected: 'Выдать',
  activating: 'Начать активацию', connected: 'Подключить', sent: 'Отправить', received: 'Подтвердить получение',
};
export const productTitle = (product?: Product) => product?.name || product?.nameKey || 'Товар';
export const orderTitle = (order: Order) => order.items.map((item) => `${productTitle(item.product)} × ${item.quantity}`).join(', ') || 'Покупка';

export function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Tashkent', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, hourCycle: 'h23',
  }).format(date);
}

export function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map((row) => row.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
