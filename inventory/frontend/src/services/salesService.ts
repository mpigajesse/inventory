import { api } from '@/lib/api';

export interface SaleItemInput {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface SaleCreatePayload {
  items: SaleItemInput[];
  payment_method: 'cash' | 'mobile_money' | 'card' | 'credit';
  amount_paid: number;
  client_id?: number | null;
  note?: string;
}

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  client: number | null;
  client_name: string | null;
  cashier: number;
  cashier_name: string;
  total_amount: number;
  amount_paid: number;
  change_given: number;
  payment_method: string;
  note: string;
  invoice_number: string | null;
  items: SaleItem[];
  created_at: string;
}

export interface PaginatedSales {
  results: Sale[];
  count: number;
}

export const salesService = {
  create: (data: SaleCreatePayload) =>
    api.post<Sale>('/sales/create/', data).then((res) => res.data),

  getAll: (params?: Record<string, string>) =>
    api
      .get<PaginatedSales>('/sales/', { params })
      .then((res) => res.data),

  getById: (id: number) =>
    api.get<Sale>(`/sales/${id}/`).then((res) => res.data),
};
