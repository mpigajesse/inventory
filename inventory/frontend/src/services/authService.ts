import { api } from '@/lib/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserProfile {
  role: 'admin' | 'vendeur';
  genre: 'M' | 'F' | null;
  phone: string;
  avatar: string | null;
  avatar_url: string | null;
  is_active: boolean;
  permissions: string[];
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  profile: UserProfile;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: AuthUser }> {
    const { data: tokens } = await api.post<AuthTokens>('/auth/token/', credentials);
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    try {
      const { data: user } = await api.get<AuthUser>('/users/me/');
      return { tokens, user };
    } catch (err) {
      // /me failed after token was stored — rollback to avoid an
      // inconsistent state where tokens exist but currentUser is null.
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw err;
    }
  },

  async logout(): Promise<void> {
    const refresh = localStorage.getItem('refresh_token');
    try {
      await api.post('/users/logout/', { refresh });
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/users/me/');
    return data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};
