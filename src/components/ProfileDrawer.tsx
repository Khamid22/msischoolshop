import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LangContext';
import { fetchOrders } from '../api';
import { coinsToSum } from '../utils/currency';
import type { Order } from '../types';
import './ProfileDrawer.scss';

export default function ProfileDrawer() {
  const { user, isProfileOpen, closeProfile, updateProfile, logout } = useAuth();
  const { t } = useLang();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone);
      setAddress(user.address);
      setAvatar(user.avatar || '');
      setSaved(false);
    }
  }, [user, isProfileOpen]);

  useEffect(() => {
    if (user && isProfileOpen) {
      fetchOrders().then((all) => {
        setOrders(
          all
            .filter((o) => o.userId === user.id || o.customerEmail === user.email)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      });
    }
  }, [user, isProfileOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        try {
          const maxSize = 300;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const out = canvas.toDataURL('image/jpeg', 0.8);
          setAvatar(out.length < src.length ? out : src);
        } catch {
          setAvatar(src);
        }
      };
      img.onerror = () => setAvatar(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      avatar: avatar || undefined,
    });
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
            {avatar ? (
              <img className="profile-drawer__avatar-img" src={avatar} alt={user.name} />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="profile-drawer__avatar-name">{user.name}</span>
          <span className="profile-drawer__balance">{t('currency')} {user.balance} <span className="profile-drawer__balance-sum">≈ {coinsToSum(user.balance)}</span></span>
          <label className="profile-drawer__avatar-upload">
            {t('changePhoto')}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              hidden
            />
          </label>
          {avatar && (
            <button
              type="button"
              className="profile-drawer__avatar-remove"
              onClick={() => setAvatar('')}
            >
              {t('removePhoto')}
            </button>
          )}
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

        <div className="profile-drawer__orders">
          <h3 className="profile-drawer__orders-title">{t('orderHistory')}</h3>
          {orders.length === 0 ? (
            <p className="profile-drawer__orders-empty">{t('ordersEmpty')}</p>
          ) : (
            <ul className="profile-drawer__orders-list">
              {orders.map((o) => (
                <li key={o.id} className="profile-drawer__order">
                  <div className="profile-drawer__order-head">
                    <span className="profile-drawer__order-num">
                      {t('orderNumber')}: {o.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="profile-drawer__order-date">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <ul className="profile-drawer__order-items">
                    {o.items.map((it) => (
                      <li key={it.product.id} className="profile-drawer__order-item">
                        {t(it.product.nameKey)} × {it.quantity}
                      </li>
                    ))}
                  </ul>
                  <div className="profile-drawer__order-total">
                    {t('total')}: {t('currency')} {o.totalPrice}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </>
        )}
      </aside>
    </>
  );
}
