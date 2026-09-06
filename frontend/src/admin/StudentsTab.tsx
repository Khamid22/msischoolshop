import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { changeAdminUserBalance } from '../api';
import { SearchIcon, XIcon } from '../components/icons';
import type { AdminBootstrap, User } from '../types';
import { AdminDialog } from './AdminDialog';
import { formatCoins, formatDate } from './presentation';

function BalanceModal({ user, close, saved }: { user: User; close: () => void; saved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState(1);
  const request = useRef({ payload: '', id: '' });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get('amount')) * direction;
    const note = String(form.get('reason') || '').trim();
    const payload = JSON.stringify({ amount, note });
    if (request.current.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try { await changeAdminUserBalance(user.id, amount, note, request.current.id); await saved(); close(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось изменить баланс'); }
    finally { setBusy(false); }
  }
  return <AdminDialog titleId="balance-title" close={close} busy={busy} className="modal--small">
    <header className="modal__header"><div><h2 id="balance-title">Изменение MSI Coin</h2><p>{user.name} · баланс Ⓒ {formatCoins(user.balance)}</p></div><button className="icon-button" disabled={busy} onClick={close} aria-label="Закрыть"><XIcon /></button></header>
    <form onSubmit={(event) => void submit(event)}><div className="modal__body form-grid">
      <div className="segmented field--wide"><button type="button" aria-pressed={direction === 1} className={direction === 1 ? 'is-active' : ''} onClick={() => setDirection(1)}>Начислить</button><button type="button" aria-pressed={direction === -1} className={direction === -1 ? 'is-active' : ''} onClick={() => setDirection(-1)}>Списать</button></div>
      <label className="field field--wide"><span>Количество MSI Coin</span><input autoFocus name="amount" type="number" min="1" step="1" required /></label>
      <label className="field field--wide"><span>Причина</span><input name="reason" placeholder="Например: награда за олимпиаду" required /></label>
      {error ? <p className="form-error field--wide" role="alert">{error}</p> : null}
    </div><footer className="modal__footer"><button className="button" type="button" disabled={busy} onClick={close}>Отмена</button><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Применить'}</button></footer></form>
  </AdminDialog>;
}

export function StudentsTab({ data, refresh }: { data: AdminBootstrap; refresh: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const filtered = data.users.filter((user) => `${user.name} ${user.studentId || ''} ${user.group || ''} ${user.email}`.toLowerCase().includes(search.toLowerCase()));
  const grants = [...data.grants].reverse();
  return <div className="page-stack">
    <div className="panel table-toolbar"><label className="search-field"><SearchIcon /><input aria-label="Поиск пользователей" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, ID, почта или группа…" /></label><span>{filtered.length} пользователей</span></div>
    <div className="split-panels"><section className="panel"><div className="table-scroll"><table className="responsive-table"><thead><tr><th>Пользователь</th><th>Группа</th><th>Баланс</th><th>Действия</th></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}>
      <td data-label="Пользователь"><strong>{user.name}</strong><small className="cell-subline">{user.studentId || user.email}</small></td><td data-label="Группа">{user.group || '—'}</td><td data-label="Баланс"><strong className="coin-value">Ⓒ {formatCoins(user.balance)}</strong></td><td className="actions-cell"><button className="button button--small" onClick={() => setEditing(user)}>Изменить баланс</button></td>
    </tr>)}</tbody></table></div>{!filtered.length ? <div className="empty-row">Пользователи не найдены</div> : null}</section>
    <section className="panel history-panel"><div className="panel__heading"><h2>Журнал операций</h2></div><div className="history-list">{grants.map((grant) => <article key={grant.id}><span className={grant.amount >= 0 ? 'history-plus' : 'history-minus'}>{grant.amount >= 0 ? '+' : ''}{formatCoins(grant.amount)}</span><div><strong>{grant.userName}</strong><small>{formatDate(grant.createdAt)}</small><small>{grant.admin}</small></div></article>)}{!grants.length ? <div className="empty-row">Операций пока не было</div> : null}</div></section></div>
    {editing ? <BalanceModal user={editing} close={() => setEditing(null)} saved={refresh} /> : null}
  </div>;
}
