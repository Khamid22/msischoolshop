import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import type { View } from '../types';
import { HomeIcon, GridIcon, BagIcon, BoxIcon, UserIcon } from './icons';
import './BottomNav.scss';

interface Props {
  view: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ view, onViewChange }: Props) {
  const { t } = useLang();
  const { user, openAuth } = useAuth();
  const { items: cartItems } = useCart();

  const navItems = [
    { view: 'home' as View, label: t('tabShop'), icon: HomeIcon },
    { view: 'catalog' as View, label: t('catalogTitle'), icon: GridIcon },
    { view: 'cart' as View, label: t('cartTitle'), icon: BagIcon },
    { view: 'orders' as View, label: t('myOrders'), icon: BoxIcon },
    { view: 'profile' as View, label: t('myProfile'), icon: UserIcon },
  ];

  const handle = (v: View) => {
    if (v === 'profile' && !user) {
      openAuth();
      return;
    }
    onViewChange(v);
  };

  return (
    <nav className="bottomnav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = view === item.view;
        return (
          <button
            key={item.view}
            className={`bottomnav__item ${active ? 'bottomnav__item--active' : ''}`}
            type="button"
            onClick={() => handle(item.view)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottomnav__icon">
              <Icon />
              {item.view === 'cart' && cartItems.length > 0 ? (
                <span className="bottomnav__count">{cartItems.reduce((sum, entry) => sum + entry.quantity, 0)}</span>
              ) : null}
            </span>
            <span className="bottomnav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
