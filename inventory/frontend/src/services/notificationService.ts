import { api } from '@/lib/api';

export interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  getAll: () =>
    api
      .get<{ results: Notification[]; count: number }>('/notifications/')
      .then((r) => r.data),

  markRead: (id: number) =>
    api.post(`/notifications/${id}/mark-read/`).then((r) => r.data),

  markAllRead: () =>
    api.post('/notifications/mark-all-read/').then((r) => r.data),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count/').then((r) => r.data),
};
