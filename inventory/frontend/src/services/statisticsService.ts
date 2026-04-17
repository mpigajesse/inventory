import { api } from '@/lib/api';

// ─── Overview ───────────────────────────────────────────────────────────────

export type StatPeriod = 'today' | 'week' | 'month' | 'year';
export type Granularity = 'hour' | 'day' | 'week' | 'month';

export interface KpiMetric {
  current: number;
  previous: number;
  change_pct: number | null;
}

export interface OverviewStats {
  period: StatPeriod;
  revenue: KpiMetric;
  transactions: KpiMetric;
  avg_basket: KpiMetric;
  new_clients: KpiMetric;
  stock_alerts: { low: number; critical: number };
  top_payment_method: string;
}

// ─── Sales ──────────────────────────────────────────────────────────────────

export interface SalesPeriodData {
  period: string;
  revenue: number;
  transactions: number;
  avg_basket: number;
}

export interface SalesStats {
  granularity: Granularity;
  start: string;
  end: string;
  data: SalesPeriodData[];
  summary: { total_revenue: number; total_transactions: number; avg_basket: number; peak_day: string | null };
}

// ─── Products ───────────────────────────────────────────────────────────────

export interface TopProduct { product_id: number; product_name: string; category: string; total_sold: number; revenue: number; }
export interface SlowMover { product_id: number; product_name: string; category: string; total_sold: number; days_without_sale: number; }
export interface CategoryBreakdown { category: string; revenue: number; units_sold: number; pct_of_total: number; }
export interface ProductStats {
  top_sellers: TopProduct[];
  slow_movers: SlowMover[];
  by_category: CategoryBreakdown[];
  new_products: number;
  inactive_products: number;
}

// ─── Stock ──────────────────────────────────────────────────────────────────

export interface StockStats {
  total_value: number;
  total_products: number;
  status_breakdown: { normal: { count: number; value: number }; low: { count: number; value: number }; critical: { count: number; value: number } };
  alerts: { product_id: number; product_name: string; quantity: number; min_threshold: number; status: string }[];
  top_value_products: { product_name: string; quantity: number; value: number }[];
}

// ─── Clients ────────────────────────────────────────────────────────────────

export interface ClientStats {
  top_clients: { client_id: number; client_name: string; total_spent: number; total_orders: number; avg_basket: number }[];
  new_clients_this_period: number;
  returning_clients: number;
  clients_with_credit: { count: number; total_credit: number };
  by_period: { period: string; new_clients: number; active_clients: number }[];
}

// ─── Cashiers ───────────────────────────────────────────────────────────────

export interface CashierStat { cashier_id: number; cashier_name: string; total_sales: number; total_revenue: number; avg_basket: number; avg_items_per_sale: number; }
export interface CashierStats { data: CashierStat[]; }

// ─── Payment Methods ────────────────────────────────────────────────────────

export interface PaymentMethodStat { method: string; label: string; count: number; total: number; pct: number; }
export interface PaymentStats { data: PaymentMethodStat[]; total_revenue: number; }

// ─── Service ────────────────────────────────────────────────────────────────

export const statisticsService = {
  getOverview: (period: StatPeriod = 'week') =>
    api.get<OverviewStats>('/statistics/overview/', { params: { period } }).then(r => r.data),

  getSales: (params?: { granularity?: Granularity; start?: string; end?: string }) =>
    api.get<SalesStats>('/statistics/sales/', { params }).then(r => r.data),

  getProducts: (params?: { period?: string; limit?: number }) =>
    api.get<ProductStats>('/statistics/products/', { params }).then(r => r.data),

  getStock: () =>
    api.get<StockStats>('/statistics/stock/').then(r => r.data),

  getClients: (params?: { period?: string }) =>
    api.get<ClientStats>('/statistics/clients/', { params }).then(r => r.data),

  getCashiers: (params?: { period?: string }) =>
    api.get<CashierStats>('/statistics/cashiers/', { params }).then(r => r.data),

  getPaymentMethods: (params?: { period?: string }) =>
    api.get<PaymentStats>('/statistics/payment-methods/', { params }).then(r => r.data),
};
