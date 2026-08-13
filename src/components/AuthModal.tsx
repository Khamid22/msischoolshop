import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import './AuthModal.scss';

type Tab = 'login' | 'register';

export default function AuthModal() {
  const { isAuthOpen, closeAuth, login, register, demoLogin } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [regName, setRegName] = useState('');
  const [regError, setRegError] = useState('');

  const reset = () => {
    setLoginEmail('');
    setLoginPass('');
    setLoginError('');
    setRegName('');
    setRegError('');
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    reset();
  };

  const handleClose = () => {
    reset();
    closeAuth();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const err = login(loginEmail, loginPass);
    if (err === 'invalid_credentials') {
      setRegError('');
      setLoginError(t('errorInvalidCredentials'));
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError(t('errorFillRequired'));
      return;
    }

    register({ name: regName.trim() });
  };

  if (!isAuthOpen) return null;

  return (
    <>
      <div className="auth-overlay" onClick={handleClose} />
      <div className="auth-modal">
        <div className="auth-modal__header">
          <div className="auth-modal__tabs">
            <button
              className={`auth-modal__tab ${tab === 'login' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => switchTab('login')}
            >
              {t('login')}
            </button>
            <button
              className={`auth-modal__tab ${tab === 'register' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => switchTab('register')}
            >
              {t('register')}
            </button>
          </div>
          <button className="auth-modal__close" onClick={handleClose}>✕</button>
        </div>

        <div className="auth-modal__body">
          {tab === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('email')}*</span>
                <input
                  className="input auth-form__input"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('password')}*</span>
                <input
                  className="input auth-form__input"
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
              </label>
              {loginError && <span className="auth-form__error">{loginError}</span>}
              <button className="btn btn-primary btn-block auth-form__submit" type="submit">
                {t('login')}
              </button>
              <div className="auth-form__divider" />
              <button
                type="button"
                className="btn btn-secondary btn-block auth-form__demo"
                onClick={demoLogin}
              >
                {t('demoLogin')}
              </button>
              <span className="auth-form__hint">{t('demoHint')}</span>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('name')}*</span>
                <input
                  className="input auth-form__input"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </label>
              {regError && <span className="auth-form__error">{regError}</span>}
              <button className="btn btn-primary btn-block auth-form__submit" type="submit">
                {t('register')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
