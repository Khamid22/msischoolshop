import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { pushNotification } from '../utils/notifications';

const DEFAULT_BALANCE = 0;

export type StudentStatus = 'checking' | 'verified' | 'not_student' | 'outside_telegram';

interface AuthContextType {
  user: User | null;
  studentStatus: StudentStatus;
  openAuth: () => void;
  spendStars: (amount: number, note?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StoredUser extends User {
  password?: string;
}

function normalizeStoredUser(u: Partial<StoredUser>): StoredUser {
  return {
    id: u.id || '',
    telegramId: u.telegramId,
    name: u.name || '',
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    avatar: u.avatar,
    balance: typeof u.balance === 'number' ? u.balance : DEFAULT_BALANCE,
    group: u.group,
    studentId: u.studentId,
    discount: typeof u.discount === 'number' ? u.discount : 10,
    earned: typeof u.earned === 'number' ? u.earned : 0,
    password: u.password || '',
  };
}

function normalizePublicUser(u: Partial<User>): User {
  return {
    id: u.id || '',
    telegramId: u.telegramId,
    name: u.name || '',
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    avatar: u.avatar,
    balance: typeof u.balance === 'number' ? u.balance : DEFAULT_BALANCE,
    group: u.group,
    studentId: u.studentId,
    discount: typeof u.discount === 'number' ? u.discount : 10,
    earned: typeof u.earned === 'number' ? u.earned : 0,
  };
}

function getUsers(): StoredUser[] {
  try {
    const raw = JSON.parse(localStorage.getItem('msi_users') || '[]');
    return Array.isArray(raw) ? raw.map(normalizeStoredUser) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem('msi_users', JSON.stringify(users));
}

function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem('msi_current_user');
    if (!raw) return null;
    const cached = normalizePublicUser(JSON.parse(raw));
    const fresh = getUsers().find((u) => u.id === cached.id);
    return fresh ? normalizePublicUser(fresh) : cached;
  } catch {
    return null;
  }
}

function saveCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem('msi_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('msi_current_user');
  }
}

async function verifyTelegramStudent(): Promise<User | null> {
  const webApp = window.Telegram?.WebApp;
  const telegramUser = webApp?.initDataUnsafe.user;
  if (!webApp || !telegramUser) return null;

  const endpoint = import.meta.env.VITE_TELEGRAM_STUDENT_ENDPOINT;
  if (endpoint && webApp.initData) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: webApp.initData }),
      });
      if (response.ok) return normalizePublicUser(await response.json());
      return null;
    } catch {
      return null;
    }
  }

  // Local mock until the backend endpoint validates Telegram initData.
  const telegramId = String(telegramUser.id);
  const match = getUsers().find((candidate) => (
    String(candidate.telegramId || '') === telegramId
    || candidate.id === telegramId
    || candidate.id === `telegram-${telegramId}`
  ));
  return match ? normalizePublicUser(match) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasTelegramUser = Boolean(window.Telegram?.WebApp.initDataUnsafe.user);
  const [user, setUser] = useState<User | null>(() => (hasTelegramUser ? null : getCurrentUser()));
  const [studentStatus, setStudentStatus] = useState<StudentStatus>(() => (
    hasTelegramUser ? 'checking' : getCurrentUser() ? 'verified' : 'outside_telegram'
  ));

  const syncIdentity = useCallback(async () => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.initDataUnsafe.user) {
      const cached = getCurrentUser();
      setUser(cached);
      setStudentStatus(cached ? 'verified' : 'outside_telegram');
      return;
    }

    setStudentStatus('checking');
    const student = await verifyTelegramStudent();
    setUser(student);
    saveCurrentUser(student);
    setStudentStatus(student ? 'verified' : 'not_student');
  }, []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();

    const timer = window.setTimeout(() => void syncIdentity(), 0);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'msi_users' || event.key === 'msi_current_user') void syncIdentity();
    };
    const onVisible = () => {
      if (!document.hidden) void syncIdentity();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', syncIdentity);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', syncIdentity);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncIdentity]);

  const openAuth = useCallback(() => {
    const outsideTelegram = !window.Telegram?.WebApp.initDataUnsafe.user;
    const message = outsideTelegram
      ? 'Open MSI Shop from the Telegram bot to verify your student account.'
      : 'This Telegram account is not linked to an MSI student.';
    if (window.Telegram?.WebApp.showAlert) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      window.alert(message);
    }
  }, []);

  const spendStars = useCallback((amount: number, note?: string): boolean => {
    if (!user || amount <= 0 || user.balance < amount) return false;
    const users = getUsers();
    const idx = users.findIndex((candidate) => candidate.id === user.id);
    const newBalance = user.balance - amount;
    if (idx !== -1) {
      users[idx].balance = newBalance;
      saveUsers(users);
    }
    pushNotification({ userId: user.id, type: 'spend', amount, note });
    const updated: User = { ...user, balance: newBalance };
    setUser(updated);
    saveCurrentUser(updated);
    return true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, studentStatus, openAuth, spendStars }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
