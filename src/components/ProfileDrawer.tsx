import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import './ProfileDrawer.scss';

export default function ProfileDrawer() {
  const { user, isProfileOpen, closeProfile, updateProfile, logout } = useAuth();
  const { t } = useLang();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone);
      setAddress(user.address);
      setSaved(false);
    }
  }, [user, isProfileOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className={`profile-overlay ${isProfileOpen ? 'profile-overlay--open' : ''}`} onClick={closeProfile} />
      <aside className={`profile-drawer ${isProfileOpen ? 'profile-drawer--open' : ''}`}>
        <div className="profile-drawer__header">
          <h2 className="profile-drawer__title">{t('myProfile')}</h2>
          <button className="profile-drawer__close" onClick={closeProfile}>✕</button>
        </div>

        {user && (
        <>
        <div className="profile-drawer__avatar">
          <div className="profile-drawer__avatar-circle">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="profile-drawer__avatar-name">{user.name}</span>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          <label className="profile-form__label">
            <span className="profile-form__label-text">{t('name')}</span>
            <input
              className="profile-form__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="profile-form__label">
            <span className="profile-form__label-text">{t('email')}</span>
            <input
              className="profile-form__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="profile-form__label">
            <span className="profile-form__label-text">{t('phone')}</span>
            <input
              className="profile-form__input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="profile-form__label">
            <span className="profile-form__label-text">{t('address')}</span>
            <textarea
              className="profile-form__input profile-form__input--area"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </label>

          {saved && <span className="profile-form__saved">{t('saved')}</span>}

          <button className="profile-form__submit" type="submit">
            {t('save')}
          </button>
          <button className="profile-form__logout" type="button" onClick={logout}>
            {t('logout')}
          </button>
        </form>
        </>
        )}
      </aside>
    </>
  );
}
