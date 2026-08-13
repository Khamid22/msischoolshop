import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { formatCoins } from '../utils/currency';
import type { Language } from '../types';
import Coin from './Coin';
import { ChevronRightIcon, HeartIcon, BoxIcon, GridIcon, CheckIcon } from './icons';
import './ProfilePage.scss';

interface Props {
  onNavigate: (view: 'orders' | 'news') => void;
}

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
];

export default function ProfilePage({ onNavigate }: Props) {
  const { user, openAuth, logout } = useAuth();
  const { t, lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { open: openFavorites } = useFavorites();

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-page__guest">
          <div className="profile-page__guest-avatar">?</div>
          <p className="profile-page__guest-text">{t('account')}</p>
          <button className="btn btn-primary profile-page__guest-btn" onClick={openAuth}>
            {t('login')} / {t('register')}
          </button>
        </div>
      </div>
    );
  }

  const initials = user.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="profile-page">
      <section className="profile-page__card">
        <div className="profile-page__identity">
          <div className="profile-page__avatar">{user.avatar ? <img src={user.avatar} alt={user.name} /> : initials}</div>
          <div className="profile-page__identity-info">
            <span className="profile-page__name">{user.name}</span>
            <span className="profile-page__meta">{t('studentGroup')}: {user.group || '—'}</span>
            <span className="profile-page__meta">{t('studentId')}: {user.studentId || '—'}</span>
          </div>
          {user.discount ? (
            <span className="tag tag-accent profile-page__discount">−{user.discount}%</span>
          ) : null}
        </div>

        <div className="profile-page__lms"><CheckIcon /><span>{t('synced')} · LMS</span></div>
      </section>

      <section className="profile-balance">
        <div className="profile-balance__head"><span>{t('goldMsiCoin')}</span><small>{t('yourBalance')}</small></div>
        <strong><Coin /> {formatCoins(user.balance)}</strong>
        <div className="profile-balance__foot">
          <span><small>{t('thisMonth')}</small><b>+{formatCoins(user.earned ?? 0)}</b></span>
          <button type="button" onClick={() => onNavigate('news')}>{t('howToEarnCoins')} <span>›</span></button>
        </div>
      </section>

      <nav className="profile-page__menu">
        <button className="profile-page__row" onClick={() => onNavigate('orders')}>
          <span className="profile-page__row-icon"><BoxIcon /></span>
          <span className="profile-page__row-label">{t('myOrders')}</span>
          <ChevronRightIcon className="profile-page__row-chevron" />
        </button>
        <button className="profile-page__row" onClick={openFavorites}>
          <span className="profile-page__row-icon"><HeartIcon /></span>
          <span className="profile-page__row-label">{t('myFavorites')}</span>
          <ChevronRightIcon className="profile-page__row-chevron" />
        </button>
        <button className="profile-page__row" onClick={() => onNavigate('news')}>
          <span className="profile-page__row-icon"><GridIcon /></span>
          <span className="profile-page__row-label">{t('myCourses')}<small>3 {t('activeCourses')}</small></span>
          <ChevronRightIcon className="profile-page__row-chevron" />
        </button>
      </nav>

      <nav className="profile-page__menu">
        <div className="profile-page__row profile-page__row--static">
          <span className="profile-page__row-label">{t('langLabel')}</span>
          <div className="profile-page__lang">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`profile-page__lang-btn ${lang === l.code ? 'profile-page__lang-btn--active' : ''}`}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <button className="profile-page__row" onClick={toggleTheme}>
          <span className="profile-page__row-label">{t('themeToggle')}</span>
          <span className={`profile-page__theme-toggle ${theme === 'light' ? 'profile-page__theme-toggle--light' : ''}`} aria-hidden="true" />
        </button>
        <a className="profile-page__row" href="./admin-login.html">
          <span className="profile-page__row-label">{t('adminPanel')}</span>
          <ChevronRightIcon className="profile-page__row-chevron" />
        </a>
      </nav>

      <button className="btn btn-secondary btn-block profile-page__logout" onClick={logout}>
        {t('logout')}
      </button>
    </div>
  );
}
