import { api } from '@/lib/api';

export interface ActivityLog {
  id: number;
  user: number;
  user_name: string | null;
  action: string;
  target_model: string;
  target_id: number | null;
  description: string;
  ip_address: string | null;
  created_at: string;
}

export const activityService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ results: ActivityLog[]; count: number }>('/activity/', { params }).then(r => r.data),
};
