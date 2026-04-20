import { api } from '@/lib/api';

export interface ActivityLog {
  id: number;
  user: number | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  target_model: string;
  target_id: number | null;
  description: string;
  ip_address: string | null;
  created_at: string;
  sale_amount: number | null;
  items_count: number | null;
  time_ago: string;
}

export interface VendeurActivitySummary {
  user_id: number;
  username: string;
  full_name: string;
  action_count: number;
  last_action_at: string | null;
  last_action: string;
  sales_count: number;
  total_revenue: number;
  is_online?: boolean;
  last_seen?: string | null;
}

export interface OnlineUser {
  user_id: number;
  username: string;
  full_name: string;
  last_seen: string;
  is_online: boolean;
  role: string;
}

export interface RealtimeResponse {
  new_logs: ActivityLog[];
  latest_id: number;
  online_count: number;
  online_users: OnlineUser[];
}

export interface VendeurAlert {
  id: string;
  type: 'inactivity' | 'big_sale' | 'high_velocity' | 'login' | 'info';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
}

export const activityService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ results: ActivityLog[]; count: number }>('/activity/', { params }).then(r => r.data),

  getVendeurSummary: (since: 'today' | 'week' | 'month' = 'today') =>
    api.get<VendeurActivitySummary[]>('/activity/vendeur-summary/', { params: { since } }).then(r => r.data),

  getOnlineUsers: () =>
    api.get<OnlineUser[]>('/users/online/').then(r => r.data),

  getRealtime: (sinceId?: number) =>
    api.get<RealtimeResponse>(
      '/activity/realtime/',
      sinceId !== undefined ? { params: { since_id: sinceId } } : {},
    ).then(r => r.data),

  getAlerts: () =>
    api.get<VendeurAlert[]>('/activity/alerts/').then(r => r.data),
};
