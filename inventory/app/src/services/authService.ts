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
  phone: string;
  avatar_url: string | null;
  is_active: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile: UserProfile;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: AuthUser }> {
    const { data: tokens } = await api.post<AuthTokens>('/auth/token/', credentials);
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    const { data: user } = await api.get<AuthUser>('/users/me/');
    return { tokens, user };
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
