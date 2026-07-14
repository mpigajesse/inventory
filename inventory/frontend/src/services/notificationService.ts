import { api } from '@/lib/api';

export type NotificationType =
  | 'stock_low'
  | 'stock_critical'
  | 'new_sale'
  | 'new_client'
  | 'system';

export interface Notification {
  id: number;
  recipient: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_product: number | null;
  product_name: string | null;
  created_at: string | null;
}

export interface UnreadCountResponse {
  count: number;
  notifications: Notification[];
}

export interface NotificationListParams {
  is_read?: boolean;
  since?: string;
  type?: NotificationType;
  // Admins : récupère le pool complet des notifications (métier), pas seulement
  // celles dont on est le destinataire. Ignoré côté backend pour les non-staff.
  all?: boolean;
}

export const notificationService = {
  getAll: (params?: NotificationListParams) =>
    api
      .get<{ results: Notification[]; count: number }>('/notifications/', { params })
      .then((r) => r.data),

  getUnreadCount: (params?: NotificationListParams) =>
    api
      .get<UnreadCountResponse>('/notifications/unread-count/', { params })
      .then((r) => r.data),

  markRead: (id: number) =>
    api.post<void>(`/notifications/${id}/mark-read/`).then((r) => r.data),

  markAllRead: () =>
    api.post<void>('/notifications/mark-all-read/').then((r) => r.data),

  markReadBulk: (ids: number[]) =>
    api.post<void>('/notifications/mark-read-bulk/', { ids }).then((r) => r.data),

  delete: (id: number) =>
    api.delete<void>(`/notifications/${id}/`).then((r) => r.data),
};
