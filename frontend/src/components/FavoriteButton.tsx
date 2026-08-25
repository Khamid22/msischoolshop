import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useLang } from '../contexts/LangContext';
import './FavoriteButton.scss';

interface Props {
  product: Product;
}

export default function FavoriteButton({ product }: Props) {
  const { user, openAuth } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t } = useLang();

  const active = isFavorite(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuth();
      return;
    }
    toggleFavorite(product);
  };

  return (
    <button
      className={`fav-btn ${active ? 'fav-btn--active' : ''}`}
      onClick={handleClick}
      aria-label={active ? t('removeFromFavorites') : t('addToFavorites')}
      title={active ? t('removeFromFavorites') : t('addToFavorites')}
    >
      <span className="fav-btn__heart">♥</span>
    </button>
  );
}
