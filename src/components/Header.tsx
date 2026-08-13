import { useEffect, useRef, useState } from 'react';
import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatCoins } from '../utils/currency';
import type { Language, View } from '../types';
import Coin from './Coin';
import { BellIcon, MoonIcon, SunIcon } from './icons';
import './Header.scss';

interface Props {
  view: View;
  onViewChange: (view: View) => void;
}

function formatNotifDate(iso: string, lang: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return lang === 'ru' ? 'только что' : lang === 'uz' ? 'hozirgina' : 'just now';
  if (minutes < 60) return lang === 'ru' ? `${minutes} мин назад` : lang === 'uz' ? `${minutes} daqiqa oldin` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === 'ru' ? `${hours} ч назад` : lang === 'uz' ? `${hours} soat oldin` : `${hours}h ago`;
  return date.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-GB');
}

export default function Header({ view, onViewChange }: Props) {
  const { lang, t } = useLang();
  const { user, openAuth } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);

  const firstName = user?.name.split(' ')[0] || '';
  const initials = user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '';
  const titles: Record<View, string> = {
    home: t('shopTitle'),
    catalog: t('catalogTitle'),
    cart: t('cartTitle'),
    orders: t('myOrders'),
    profile: t('myProfile'),
    news: t('tabNews'),
  };

  return (
    <header className="topbar">
      <button className="topbar__brand" type="button" onClick={() => onViewChange('home')} aria-label={t('tabShop')}>
        <span className="topbar__mark" aria-hidden="true">MSI</span>
        <span className="topbar__brand-copy">
          <span className="topbar__title">{titles[view]}</span>
          {view === 'home' && <span className="topbar__eyebrow">{t('miniApp')}</span>}
        </span>
      </button>

      <div className="topbar__right">
        <button
          className="topbar__icon-btn topbar__theme-btn"
          type="button"
          onClick={toggleTheme}
          aria-label={t(theme === 'dark' ? 'switchLightMode' : 'switchDarkMode')}
          title={t(theme === 'dark' ? 'switchLightMode' : 'switchDarkMode')}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        {user ? (
          <>
            <div className="topbar__notif-wrap" ref={notifRef}>
              <button
                className="topbar__icon-btn"
                type="button"
                onClick={() => {
                  if (!notifOpen && unreadCount > 0) markAllRead();
                  setNotifOpen((open) => !open);
                }}
                aria-label={t('notifications')}
                aria-expanded={notifOpen}
              >
                <BellIcon className="topbar__bell" />
                {unreadCount > 0 && <span key={unreadCount} className="topbar__badge">{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="topbar__notif" role="dialog" aria-label={t('notifications')}>
                  <div className="topbar__notif-head">
                    <span>{t('notifications')}</span>
                    <span>{firstName}</span>
                  </div>
                  <div className="topbar__notif-list">
                    {notifications.length === 0 ? (
                      <div className="topbar__notif-empty">{t('noNotifications')}</div>
                    ) : (
                      notifications.slice(0, 30).map((notification) => {
                        const positive = notification.type === 'topup' || notification.type === 'welcome';
                        const label = `${positive ? '+' : '−'}${formatCoins(notification.amount)}`;
                        const text = notification.note || t(
                          notification.type === 'welcome'
                            ? 'notifWelcome'
                            : notification.type === 'topup'
                              ? 'notifTopup'
                              : 'notifSpend',
                        );
                        return (
                          <div
                            key={notification.id}
                            className={`topbar__notif-item ${notification.read ? 'topbar__notif-item--read' : ''}`}
                          >
                            <span className={`topbar__notif-ico ${positive ? 'topbar__notif-ico--plus' : ''}`}>
                              {positive ? '＋' : '−'}
                            </span>
                            <div className="topbar__notif-body">
                              <div className="topbar__notif-text">
                                <span className="topbar__notif-amount">{label} <Coin /></span>
                                {text ? <span className="topbar__notif-note">· {text}</span> : null}
                              </div>
                              <div className="topbar__notif-date">{formatNotifDate(notification.createdAt, lang)}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="topbar__avatar"
              type="button"
              onClick={() => onViewChange('profile')}
              aria-label={t('myProfile')}
            >
              {user.avatar ? <img src={user.avatar} alt="" /> : initials}
            </button>
          </>
        ) : (
          <button className="btn btn-secondary topbar__signin" type="button" onClick={openAuth}>
            {t('login')}
          </button>
        )}
      </div>
    </header>
  );
}
