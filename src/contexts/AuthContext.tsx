import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { pushNotification } from '../utils/notifications';

const DEFAULT_BALANCE = 1000;

interface AuthContextType {
  user: User | null;
  isAuthOpen: boolean;
  isProfileOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  register: (data: Omit<User, 'id' | 'balance'> & { password: string }) => string | null;
  login: (email: string, password: string) => string | null;
  logout: () => void;
  updateProfile: (data: Partial<Omit<User, 'id'>>) => void;
  spendStars: (amount: number, note?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StoredUser extends User {
  password: string;
}

function normalizeStoredUser(u: Partial<StoredUser>): StoredUser {
  return {
    id: u.id || '',
    name: u.name || '',
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    avatar: u.avatar,
    balance: typeof u.balance === 'number' ? u.balance : DEFAULT_BALANCE,
    password: u.password || '',
  };
}

function normalizePublicUser(u: Partial<User>): User {
  return {
    id: u.id || '',
    name: u.name || '',
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    avatar: u.avatar,
    balance: typeof u.balance === 'number' ? u.balance : DEFAULT_BALANCE,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getCurrentUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const openAuth = () => setIsAuthOpen(true);
  const closeAuth = () => setIsAuthOpen(false);
  const openProfile = () => setIsProfileOpen(true);
  const closeProfile = () => setIsProfileOpen(false);

  useEffect(() => {
    const sync = () => setUser(getCurrentUser());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'msi_users' && e.key !== 'msi_current_user') return;
      sync();
    };
    const onFocus = () => sync();
    const onVisible = () => {
      if (!document.hidden) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const register = useCallback((data: Omit<User, 'id' | 'balance'> & { password: string }): string | null => {
    const users = getUsers();
    if (users.find((u) => u.email === data.email)) {
      return 'email_exists';
    }
    const newUser: StoredUser = {
      ...data,
      id: crypto.randomUUID(),
      balance: DEFAULT_BALANCE,
    };
    users.push(newUser);
    saveUsers(users);
    pushNotification({ userId: newUser.id, type: 'welcome', amount: DEFAULT_BALANCE });
    const { password: _, ...publicUser } = newUser;
    setUser(publicUser);
    saveCurrentUser(publicUser);
    setIsAuthOpen(false);
    return null;
  }, []);

  const login = useCallback((email: string, password: string): string | null => {
    const users = getUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      return 'invalid_credentials';
    }
    const { password: _, ...publicUser } = found;
    setUser(publicUser);
    saveCurrentUser(publicUser);
    setIsAuthOpen(false);
    return null;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveCurrentUser(null);
    setIsProfileOpen(false);
  }, []);

  const updateProfile = useCallback((data: Partial<Omit<User, 'id'>>) => {
    if (!user) return;
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) return;
    users[idx] = normalizeStoredUser({ ...users[idx], ...data });
    saveUsers(users);
    const updated: User = { ...user, ...data, balance: users[idx].balance };
    setUser(updated);
    saveCurrentUser(updated);
  }, [user]);

  const spendStars = useCallback((amount: number, note?: string): boolean => {
    if (!user || amount <= 0 || user.balance < amount) return false;
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
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
    <AuthContext.Provider
      value={{
        user,
        isAuthOpen,
        isProfileOpen,
        openAuth,
        closeAuth,
        openProfile,
        closeProfile,
        register,
        login,
        logout,
        updateProfile,
        spendStars,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
