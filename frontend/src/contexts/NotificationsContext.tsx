import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppNotification } from '../types';
import { fetchNotifications, markNotificationsRead } from '../api';
import { useAuth } from './AuthContext';

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications(await fetchNotifications());
    } catch {
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener('msi:notifications', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('msi:notifications', handler);
      window.removeEventListener('focus', handler);
    };
  }, [load]);

  const markAll = useCallback(() => {
    if (!user) return;
    void markNotificationsRead().then(load);
  }, [load, user]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead: markAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within NotificationsProvider');
  return context;
};
