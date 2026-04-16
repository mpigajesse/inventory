import { api } from '@/lib/api';

export interface ActivityLog {
  id: number;
  user: number;
  action: string;
  target_model: string;
  description: string;
  created_at: string;
  user_name: string;
}

export const activityService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ results: ActivityLog[]; count: number }>('/activity/', { params }).then(r => r.data),
};
