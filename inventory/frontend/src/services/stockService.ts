import { api } from '@/lib/api';

export interface StockItem {
  id: number;
  product: number;
  product_name: string;
  product_barcode: string | null;
  category_name: string;
  quantity: number;
  min_threshold: number;
  max_threshold: number;
  selling_price: number;
  stock_value: number;
  status: 'normal' | 'bas' | 'critique';
}

export interface StockMovement {
  id: number;
  product: number;
  product_name: string;
  movement_type: 'entry' | 'exit' | 'adjustment' | 'sale' | 'return';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  note: string;
  performed_by_name: string;
  created_at: string;
}

export interface AdjustmentPayload {
  movement_type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  note?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
}

export const stockService = {
  getAll: (params?: Record<string, string>) =>
    api
      .get<PaginatedResponse<StockItem>>('/stock/', { params })
      .then((res) => res.data),

  getAlerts: () =>
    api.get<StockItem[]>('/stock/alerts/').then((res) => res.data),

  adjust: (stockId: number, data: AdjustmentPayload) =>
    api
      .post<StockItem>(`/stock/${stockId}/adjust/`, data)
      .then((res) => res.data),

  updateThresholds: (stockId: number, data: { min_threshold?: number; max_threshold?: number }) =>
    api
      .patch<StockItem>(`/stock/${stockId}/thresholds/`, data)
      .then((res) => res.data),

  getMovements: (params?: Record<string, string>) =>
    api
      .get<PaginatedResponse<StockMovement>>('/stock/movements/', { params })
      .then((res) => res.data),
};
