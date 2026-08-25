import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import {
  ApiError,
  authenticateTelegram,
  clearUserSession,
  fetchCurrentUser,
  getUserToken,
} from '../api';


export type StudentStatus = 'checking' | 'verified' | 'not_student' | 'outside_telegram';

interface AuthContextType {
  user: User | null;
  studentStatus: StudentStatus;
  openAuth: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCachedUser(): User | null {
  if (!getUserToken()) return null;
  try {
    return JSON.parse(localStorage.getItem('msi_current_user') || 'null') as User | null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null): void {
  if (user) localStorage.setItem('msi_current_user', JSON.stringify(user));
  else localStorage.removeItem('msi_current_user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasTelegramUser = Boolean(window.Telegram?.WebApp.initDataUnsafe.user);
  const cachedUser = getCachedUser();
  const [user, setUser] = useState<User | null>(() => (hasTelegramUser ? null : cachedUser));
  const [studentStatus, setStudentStatus] = useState<StudentStatus>(() => (
    hasTelegramUser ? 'checking' : cachedUser ? 'verified' : 'outside_telegram'
  ));

  const refreshUser = useCallback(async () => {
    if (!getUserToken()) {
      setUser(null);
      cacheUser(null);
      setStudentStatus(window.Telegram?.WebApp.initDataUnsafe.user ? 'not_student' : 'outside_telegram');
      return;
    }
    try {
      const freshUser = await fetchCurrentUser();
      setUser(freshUser);
      cacheUser(freshUser);
      setStudentStatus('verified');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearUserSession();
        setUser(null);
        setStudentStatus(window.Telegram?.WebApp.initDataUnsafe.user ? 'not_student' : 'outside_telegram');
      }
    }
  }, []);

  const syncIdentity = useCallback(async () => {
    const webApp = window.Telegram?.WebApp;
    if (webApp?.initDataUnsafe.user && webApp.initData) {
      setStudentStatus('checking');
      try {
        const student = await authenticateTelegram(webApp.initData);
        setUser(student);
        cacheUser(student);
        setStudentStatus(student ? 'verified' : 'not_student');
      } catch {
        if (getCachedUser()) await refreshUser();
        else setStudentStatus('not_student');
      }
      return;
    }
    await refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();

    const timer = window.setTimeout(() => void syncIdentity(), 0);
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'msi_user_token' || event.key === 'msi_current_user') void syncIdentity();
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
    if (window.Telegram?.WebApp.showAlert) window.Telegram.WebApp.showAlert(message);
    else window.alert(message);
  }, []);

  return (
    <AuthContext.Provider value={{ user, studentStatus, openAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
