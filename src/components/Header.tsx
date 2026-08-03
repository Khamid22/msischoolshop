import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { useFavorites } from '../contexts/FavoritesContext';
import type { Language, View } from '../types';
import './Header.scss';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
];

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

interface Props {
  view: View;
  onViewChange: (view: View) => void;
}

export default function Header({ view, onViewChange }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const { open, totalItems } = useCart();
  const { user, openAuth, openProfile } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { favorites, open: openFavorites } = useFavorites();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);

  const tabs = [
    { view: 'shop' as View, label: t('tabShop') },
    { view: 'catalog' as View, label: t('tabCatalog') },
    { view: 'news' as View, label: t('tabNews') },
  ];

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notifOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const tgt = e.target as Node;
      if (burgerRef.current && burgerRef.current.contains(tgt)) return;
      if (mobileMenuRef.current && mobileMenuRef.current.contains(tgt)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header__left">
        <button
          className="header__burger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Меню"
          ref={burgerRef}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <h1 className="header__logo">{t('shopTitle')}</h1>
      </div>

      <nav className="header__nav">
        {tabs.map((tb) => (
          <button
            key={tb.view}
            className={`header__tab ${view === tb.view ? 'header__tab--active' : ''}`}
            onClick={() => onViewChange(tb.view)}
          >
            {tb.label}
          </button>
        ))}
      </nav>

      <div className="header__right">
        {user && (
          <div className="header__notif-wrap" ref={notifRef}>
            <button
              className="header__bell-btn"
              onClick={() => {
                if (!notifOpen && unreadCount > 0) markAllRead();
                setNotifOpen((o) => !o);
              }}
              title={t('notifications')}
            >
              <span className="header__bell-icon">🔔</span>
              {unreadCount > 0 && (
                <span key={unreadCount} className="header__bell-badge">{unreadCount}</span>
              )}
            </button>
            {notifOpen && (
              <div className="header__notif">
                <div className="header__notif-head">
                  <span className="header__notif-title">{t('notifications')}</span>
                </div>
                <div className="header__notif-list">
                  {notifications.length === 0 ? (
                    <div className="header__notif-empty">{t('noNotifications')}</div>
                  ) : (
                    notifications.slice(0, 30).map((n) => {
                      const positive = n.type === 'topup' || n.type === 'welcome';
                      const label = positive ? `+${n.amount}` : `−${n.amount}`;
                      const text = n.note
                        ? n.note
                        : t(n.type === 'welcome' ? 'notifWelcome' : n.type === 'topup' ? 'notifTopup' : 'notifSpend');
                      return (
                        <div
                          key={n.id}
                          className={`header__notif-item ${n.read ? 'header__notif-item--read' : ''}`}
                        >
                          <span className={`header__notif-ico ${positive ? 'header__notif-ico--plus' : ''}`}>
                            {positive ? '＋' : '−'}
                          </span>
                          <div className="header__notif-body">
                            <div className="header__notif-text">
                              <span className="header__notif-amount">{label} {t('currency')}</span>
                              {text && <span className="header__notif-note">· {text}</span>}
                            </div>
                            <div className="header__notif-date">{formatNotifDate(n.createdAt, lang)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {user && (
          <button className="header__balance" onClick={openProfile} title={t('balance')}>
            <span className="header__balance-icon">{t('currency')}</span>
            <span key={user.balance} className="header__balance-value">{user.balance}</span>
          </button>
        )}
        {user && (
          <button
            className="header__fav-btn"
            onClick={openFavorites}
            title={t('favorites')}
          >
            <span className="header__fav-icon">♥</span>
            {favorites.length > 0 && (
              <span key={favorites.length} className="header__fav-badge">{favorites.length}</span>
            )}
          </button>
        )}
        <div className="header__lang-switcher">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`header__lang-btn ${lang === l.code ? 'header__lang-btn--active' : ''}`}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button className="header__theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '◼' : '◻'}
        </button>
        <button className="header__cart-btn" onClick={open}>
          <span className="header__cart-icon">◻</span>
          <span className="header__cart-label">{t('cart')}</span>
          {totalItems > 0 && (
            <span key={totalItems} className="header__cart-badge">{totalItems}</span>
          )}
        </button>
        <button className="header__user-btn" onClick={user ? openProfile : openAuth}>
          {user && user.avatar ? (
            <img className="header__user-avatar" src={user.avatar} alt={user.name} />
          ) : (
            <span className="header__user-icon">◉</span>
          )}
          <span className="header__user-label">{user ? user.name : t('account')}</span>
        </button>
        <a href="/admin-login.html" className="header__admin-btn" title="Админ-панель">
          ⚙
        </a>
      </div>

      {menuOpen && (
        <nav className="header__mobile-menu" ref={mobileMenuRef}>
          {tabs.map((tb) => (
            <button
              key={tb.view}
              className={`header__mobile-tab ${view === tb.view ? 'header__mobile-tab--active' : ''}`}
              onClick={() => {
                onViewChange(tb.view);
                setMenuOpen(false);
              }}
            >
              {tb.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
