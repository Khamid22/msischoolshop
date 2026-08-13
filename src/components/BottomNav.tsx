import { useLang } from '../contexts/LangContext';
import type { View } from '../types';
import { HomeIcon, GridIcon, BoxIcon, UserIcon } from './icons';
import './BottomNav.scss';

interface Props {
  view: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ view, onViewChange }: Props) {
  const { t } = useLang();
  const navItems = [
    { view: 'home' as View, label: t('tabShop'), icon: HomeIcon },
    { view: 'catalog' as View, label: t('catalogTitle'), icon: GridIcon },
    { view: 'orders' as View, label: t('myOrders'), icon: BoxIcon },
    { view: 'profile' as View, label: t('myProfile'), icon: UserIcon },
  ];

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
            onClick={() => onViewChange(item.view)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottomnav__icon">
              <Icon />
            </span>
            <span className="bottomnav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
