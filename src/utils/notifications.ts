import type { AppNotification, NotificationType } from '../types';

const KEY = 'msi_notifications';

export function getNotifications(): AppNotification[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function getUserNotifications(userId: string): AppNotification[] {
  return getNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pushNotification(data: {
  userId: string;
  type: NotificationType;
  amount: number;
  note?: string;
}): AppNotification {
  const list = getNotifications();
  const notification: AppNotification = {
    id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    userId: data.userId,
    type: data.type,
    amount: data.amount,
    note: data.note,
    createdAt: new Date().toISOString(),
    read: false,
  };
  list.push(notification);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('msi:notifications'));
  return notification;
}

export function markAllRead(userId: string): void {
  const list = getNotifications();
  let changed = false;
  list.forEach((n) => {
    if (n.userId === userId && !n.read) {
      n.read = true;
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('msi:notifications'));
  }
}
