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
  const userId = user?.id;
  const [result, setResult] = useState<{ userId: string; items: AppNotification[] } | null>(null);
  const [revision, setRevision] = useState(0);
  const load = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void fetchNotifications(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setResult({ userId, items });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ userId, items: [] });
      });
    return () => controller.abort();
  }, [userId, revision]);

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
    void markNotificationsRead().then(load).catch(() => {});
  }, [load, user]);

  const notifications = result?.userId === userId ? result?.items ?? [] : [];
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
