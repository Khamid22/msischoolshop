import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LangContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import type { Language } from '../types';
import './Header.scss';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLang();
  const { open, totalItems } = useCart();
  const { user, openAuth, openProfile } = useAuth();

  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__logo">{t('shopTitle')}</h1>
      </div>
      <div className="header__right">
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
            <span className="header__cart-badge">{totalItems}</span>
          )}
        </button>
        <button className="header__user-btn" onClick={user ? openProfile : openAuth}>
          <span className="header__user-icon">◉</span>
          <span className="header__user-label">{user ? user.name : t('account')}</span>
        </button>
        <a href="/src/pages/admin-login.html" className="header__admin-btn" title="Админ-панель">
          ⚙
        </a>
      </div>
    </header>
  );
}
