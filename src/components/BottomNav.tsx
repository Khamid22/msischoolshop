import { useLang } from '../contexts/LangContext';
import { useAuth } from '../contexts/AuthContext';
import type { View } from '../types';
import { HomeIcon, GridIcon, BoxIcon, UserIcon } from './icons';
import './BottomNav.scss';

interface Props {
  view: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ view, onViewChange }: Props) {
  const { t } = useLang();
  const { user, openAuth } = useAuth();

  const items = [
    { view: 'home' as View, label: t('tabShop'), icon: HomeIcon },
    { view: 'catalog' as View, label: t('catalogTitle'), icon: GridIcon },
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
      {items.map((item) => {
        const Icon = item.icon;
        const active = view === item.view;
        return (
          <button
            key={item.view}
            className={`bottomnav__item ${active ? 'bottomnav__item--active' : ''}`}
            onClick={() => handle(item.view)}
          >
            <span className="bottomnav__icon"><Icon /></span>
            <span className="bottomnav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
