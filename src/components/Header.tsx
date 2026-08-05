import { useState, useEffect, useRef } from 'react';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { formatCoins } from '../utils/currency';
import type { Language, View } from '../types';
import Coin from './Coin';
import { BellIcon, SettingsIcon } from './icons';
import './Header.scss';

interface Props {
  view: View;
}

function formatNotifDate(iso: string, lang: Language): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return lang === 'ru' ? 'только что' : lang === 'uz' ? 'hozirgina' : 'just now';
  if (min < 60) return lang === 'ru' ? `${min} мин назад` : lang === 'uz' ? `${min} daqiqa oldin` : `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return lang === 'ru' ? `${hours} ч назад` : lang === 'uz' ? `${hours} soat oldin` : `${hours}h ago`;
  return d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-GB');
}

export default function Header({ view }: Props) {
  const { lang, t } = useLang();
  const { user, openAuth, openProfile } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notifOpen]);

  const firstName = user ? user.name.split(' ')[0] : '';
  const titles: Record<View, string> = {
    home: user ? `${t('homeGreeting')}, ${firstName}` : t('shopTitle'),
    catalog: t('catalogTitle'),
    orders: t('myOrders'),
    profile: t('myProfile'),
    news: t('tabNews'),
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <h1 className="topbar__title">{titles[view]}</h1>
      </div>

      <div className="topbar__right">
        {user ? (
          <>
            <div className="topbar__notif-wrap" ref={notifRef}>
              <button
                className="topbar__icon-btn"
                onClick={() => {
                  if (!notifOpen && unreadCount > 0) markAllRead();
                  setNotifOpen((o) => !o);
                }}
                title={t('notifications')}
              >
                <BellIcon className="topbar__bell" />
                {unreadCount > 0 && (
                  <span key={unreadCount} className="topbar__badge">{unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="topbar__notif">
                  <div className="topbar__notif-list">
                    {notifications.length === 0 ? (
                      <div className="topbar__notif-empty">{t('noNotifications')}</div>
                    ) : (
                      notifications.slice(0, 30).map((n) => {
                        const positive = n.type === 'topup' || n.type === 'welcome';
                        const label = positive ? `+${formatCoins(n.amount)}` : `−${formatCoins(n.amount)}`;
                        const text = n.note || t(n.type === 'welcome' ? 'notifWelcome' : n.type === 'topup' ? 'notifTopup' : 'notifSpend');
                        return (
                          <div
                            key={n.id}
                            className={`topbar__notif-item ${n.read ? 'topbar__notif-item--read' : ''}`}
                          >
                            <span className={`topbar__notif-ico ${positive ? 'topbar__notif-ico--plus' : ''}`}>
                              {positive ? '＋' : '−'}
                            </span>
                            <div className="topbar__notif-body">
                              <div className="topbar__notif-text">
                                <span className="topbar__notif-amount">{label} <Coin /></span>
                                {text && <span className="topbar__notif-note">· {text}</span>}
                              </div>
                              <div className="topbar__notif-date">{formatNotifDate(n.createdAt, lang)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="topbar__balance" onClick={openProfile} title={t('balance')}>
              <Coin />
              <span key={user.balance} className="topbar__balance-value">{formatCoins(user.balance)}</span>
            </button>
          </>
        ) : (
          <button className="btn btn-ghost topbar__signin" onClick={openAuth}>
            {t('login')}
          </button>
        )}

        <a className="topbar__icon-btn topbar__admin" href="/admin-login.html" title={t('adminPanel')}>
          <SettingsIcon className="topbar__settings" />
        </a>
      </div>
    </header>
  );
}
