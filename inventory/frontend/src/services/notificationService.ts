import { api } from '@/lib/api';

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
  notifications: Notification[];
}

export interface NotificationListParams {
  is_read?: boolean;
  since?: string;
}

export const notificationService = {
  getAll: (params?: NotificationListParams) =>
    api
      .get<{ results: Notification[]; count: number }>('/notifications/', { params })
      .then((r) => r.data),

  getUnreadCount: () =>
    api
      .get<UnreadCountResponse>('/notifications/unread-count/')
      .then((r) => r.data),

  markRead: (id: number) =>
    api.post<void>(`/notifications/${id}/mark-read/`).then((r) => r.data),

  markAllRead: () =>
    api.post<void>('/notifications/mark-all-read/').then((r) => r.data),

  markReadBulk: (ids: number[]) =>
    api.post<void>('/notifications/mark-read-bulk/', { ids }).then((r) => r.data),
};
