import { api } from '@/lib/api';

export interface DashboardStats {
  today: { revenue: number; sales_count: number };
  month: { revenue: number; sales_count: number };
  stock: { low_count: number; critical_count: number; total_products: number };
  clients: { total: number };
  sales_by_day: Array<{ day: string; total: number; count: number }>;
  top_products: Array<{ product__name: string; total_sold: number; revenue: number }>;
  recent_sales: Array<Record<string, unknown>>;
}

export const dashboardService = {
  getStats: () =>
    api.get<DashboardStats>('/dashboard/').then((res) => res.data),
};
