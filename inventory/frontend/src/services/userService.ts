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

export const userService = {
  getAll: () =>
    api.get<{ results: UserListItem[]; count: number }>('/users/').then((r) => r.data),

  create: (data: CreateUserPayload) =>
    api.post<UserListItem>('/users/', data).then((r) => r.data),

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
