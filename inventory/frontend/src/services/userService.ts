import { api } from '@/lib/api';
import type { AuthUser } from './authService';
import type { Permission } from '@/hooks/usePermissions';

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  date_joined: string;
  profile: {
    role: 'admin' | 'vendeur';
    phone: string;
    avatar: string | null;
    avatar_url: string | null;
    is_active: boolean;
    permissions: string[];
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
  /** Maps to `profile_is_active` on the backend UserUpdateSerializer */
  profile_is_active?: boolean;
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

  setPermissions: (id: number, permissions: Permission[]): Promise<void> =>
    api.patch(`/users/${id}/set-permissions/`, { permissions }).then(() => undefined),
};
