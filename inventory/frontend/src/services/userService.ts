import { api } from '@/lib/api';
import type { AuthUser } from './authService';

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  profile: {
    role: 'admin' | 'vendeur';
    phone: string;
    avatar_url: string | null;
  };
}

export interface CreateUserPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
  phone?: string;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  role?: 'admin' | 'vendeur';
  phone?: string;
  is_active_profile?: boolean;
}

export const userService = {
  getAll: () =>
    api.get<{ results: UserListItem[]; count: number }>('/users/').then((r) => r.data),

  create: (data: CreateUserPayload) =>
    api.post<UserListItem>('/users/', data).then((r) => r.data),

  update: (id: number, data: Partial<UserUpdatePayload>) =>
    api.patch<UserListItem>(`/users/${id}/`, data).then((r) => r.data),

  activate: (id: number) =>
    api.post<UserListItem>(`/users/${id}/activate/`).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/users/${id}/`).then((r) => r.data),

  updateMe: (data: Partial<AuthUser>) =>
    api.patch<AuthUser>('/users/me/', data).then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api
      .patch('/users/me/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        refresh: localStorage.getItem('refresh_token'),
      })
      .then((r) => r.data),
};
