import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../types';
import { useAuth } from './AuthContext';

const KEY = 'msi_favorites';

interface FavoritesContextType {
  favorites: Product[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

function getAll(): Record<string, Product[]> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function getFor(userId: string): Product[] {
  const all = getAll();
  return Array.isArray(all[userId]) ? all[userId] : [];
}

function saveFor(userId: string, items: Product[]) {
  const all = getAll();
  all[userId] = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setFavorites(user ? getFor(user.id) : []);
  }, [user]);

  useEffect(() => {
    const sync = () => setFavorites(user ? getFor(user.id) : []);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
    };
  }, [user]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.some((p) => p.id === productId);
  }, [favorites]);

  const toggleFavorite = useCallback((product: Product) => {
    if (!user) return;
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists ? prev.filter((p) => p.id !== product.id) : [...prev, product];
      saveFor(user.id, next);
      return next;
    });
  }, [user]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, isOpen, open, close }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};
