import { createContext, useContext, useState, useEffect } from 'react';
import { authService, AuthUser } from '@/services/authService';
import type { Permission } from '@/hooks/usePermissions';

export type UserRole = 'admin' | 'vendeur';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  permissions?: Permission[];
}

interface AuthContextValue {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

function mapApiUserToUser(apiUser: AuthUser): User {
  return {
    id: String(apiUser.id),
    name: apiUser.full_name || apiUser.username,
    email: apiUser.email,
    role: apiUser.profile.role,
    avatar: apiUser.profile.avatar_url || undefined,
    permissions: (apiUser as AuthUser & { permissions?: Permission[] }).permissions ?? [],
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On mount: restore session from stored access_token
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      setIsLoading(false);
      return;
    }

    authService
      .getMe()
      .then((apiUser) => {
        setCurrentUser(mapApiUserToUser(apiUser));
      })
      .catch(() => {
        // Token is invalid or expired — clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  async function login(username: string, password: string): Promise<void> {
    const { user: apiUser } = await authService.login({ username, password });
    setCurrentUser(mapApiUserToUser(apiUser));
  }

  async function logout(): Promise<void> {
    await authService.logout();
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
