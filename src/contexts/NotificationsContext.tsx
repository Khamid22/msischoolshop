import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import { getUserNotifications, markAllRead } from '../utils/notifications';

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setNotifications(getUserNotifications(user.id));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('msi:notifications', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('msi:notifications', handler);
      window.removeEventListener('storage', handler);
    };
  }, [load]);

  const markAll = useCallback(() => {
    if (user) markAllRead(user.id);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead: markAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
