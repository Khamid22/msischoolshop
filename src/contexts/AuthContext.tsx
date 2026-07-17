import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthOpen: boolean;
  isProfileOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  register: (data: Omit<User, 'id'> & { password: string }) => string | null;
  login: (email: string, password: string) => string | null;
  logout: () => void;
  updateProfile: (data: Omit<User, 'id'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StoredUser extends User {
  password: string;
}

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem('msi_users') || '[]');
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
    return raw ? JSON.parse(raw) : null;
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

  const register = useCallback((data: Omit<User, 'id'> & { password: string }): string | null => {
    const users = getUsers();
    if (users.find((u) => u.email === data.email)) {
      return 'email_exists';
    }
    const newUser: StoredUser = {
      ...data,
      id: crypto.randomUUID(),
    };
    users.push(newUser);
    saveUsers(users);
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

  const updateProfile = useCallback((data: Omit<User, 'id'>) => {
    if (!user) return;
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx === -1) return;
    users[idx] = { ...users[idx], ...data };
    saveUsers(users);
    const updated: User = { id: user.id, ...data };
    setUser(updated);
    saveCurrentUser(updated);
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
