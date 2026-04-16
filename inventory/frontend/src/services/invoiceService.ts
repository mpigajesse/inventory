import { api } from '@/lib/api';
import type { SaleItem } from './salesService';

export interface Invoice {
  id: number;
  invoice_number: string;
  sale: number | null;
  client: number | null;
  client_name: string | null;
  status: 'paid' | 'partial' | 'unpaid' | 'cancelled';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  note: string;
  issued_by_name: string;
  issued_at: string;
  items: SaleItem[];
}

export interface PaginatedInvoices {
  results: Invoice[];
  count: number;
}

export const invoiceService = {
  getAll: (params?: Record<string, string>) =>
    api
      .get<PaginatedInvoices>('/invoices/', { params })
      .then((res) => res.data),

  getById: (id: number) =>
    api.get<Invoice>(`/invoices/${id}/`).then((res) => res.data),
};
