import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import './AuthModal.scss';

type Tab = 'login' | 'register';

export default function AuthModal() {
  const { isAuthOpen, closeAuth, login, register } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regError, setRegError] = useState('');

  const reset = () => {
    setLoginEmail('');
    setLoginPass('');
    setLoginError('');
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPass('');
    setRegPass2('');
    setRegError('');
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

    if (!regName.trim() || !regEmail.trim() || !regPass.trim()) {
      setRegError(t('errorFillRequired'));
      return;
    }
    if (regPass !== regPass2) {
      setRegError(t('errorPasswordMismatch'));
      return;
    }
    if (regPass.length < 6) {
      setRegError(t('errorPasswordShort'));
      return;
    }

    const err = register({
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      address: '',
      password: regPass,
    });
    if (err === 'email_exists') {
      setRegError(t('errorEmailExists'));
    }
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
              onClick={() => { setTab('login'); reset(); }}
            >
              {t('login')}
            </button>
            <button
              className={`auth-modal__tab ${tab === 'register' ? 'auth-modal__tab--active' : ''}`}
              onClick={() => { setTab('register'); reset(); }}
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
                  className="auth-form__input"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('password')}*</span>
                <input
                  className="auth-form__input"
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  required
                />
              </label>
              {loginError && <span className="auth-form__error">{loginError}</span>}
              <button className="auth-form__submit" type="submit">
                {t('login')}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('name')}*</span>
                <input
                  className="auth-form__input"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('email')}*</span>
                <input
                  className="auth-form__input"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('phone')}</span>
                <input
                  className="auth-form__input"
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('password')}*</span>
                <input
                  className="auth-form__input"
                  type="password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
              <label className="auth-form__label">
                <span className="auth-form__label-text">{t('confirmPassword')}*</span>
                <input
                  className="auth-form__input"
                  type="password"
                  value={regPass2}
                  onChange={(e) => setRegPass2(e.target.value)}
                  required
                />
              </label>
              {regError && <span className="auth-form__error">{regError}</span>}
              <button className="auth-form__submit" type="submit">
                {t('register')}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
