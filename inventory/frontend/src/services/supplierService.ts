import { api } from '@/lib/api';

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address?: string;
  city: string;
  country: string;
  note?: string;
  is_active: boolean;
  /** Calculé côté backend via SerializerMethodField. */
  orders_count: number;
  /** Solde dû au fournisseur (positif = on lui doit, négatif = il nous doit). */
  balance?: number;
  created_at: string;
}

export interface PaginatedSuppliers {
  results: Supplier[];
  count: number;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export type PurchaseOrderStatus = 'pending' | 'confirmed' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: number;
  supplier: number;
  supplier_name: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  note?: string;
  items: PurchaseOrderItem[];
  ordered_by_name: string | null;
  ordered_at: string;
  received_at: string | null;
}

export interface PaginatedPurchaseOrders {
  results: PurchaseOrder[];
  count: number;
}

export interface PurchaseOrderCreatePayload {
  supplier: number;
  status?: PurchaseOrderStatus;
  note?: string;
  items: Omit<PurchaseOrderItem, 'id' | 'product_name' | 'subtotal'>[];
}

// ─── Services ────────────────────────────────────────────────────────────────

export const supplierService = {
  getAll: (params?: Record<string, string>) =>
    api
      .get<PaginatedSuppliers>('/suppliers/', { params })
      .then((r) => r.data),

  getById: (id: number) =>
    api.get<Supplier>(`/suppliers/${id}/`).then((r) => r.data),

  create: (data: Partial<Supplier>) =>
    api.post<Supplier>('/suppliers/', data).then((r) => r.data),

  update: (id: number, data: Partial<Supplier>) =>
    api.patch<Supplier>(`/suppliers/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/suppliers/${id}/`).then((r) => r.data),
};

export const purchaseOrderService = {
  getAll: (params?: Record<string, string>) =>
    api
      .get<PaginatedPurchaseOrders>('/suppliers/orders/', { params })
      .then((r) => r.data),

  getById: (id: number) =>
    api.get<PurchaseOrder>(`/suppliers/orders/${id}/`).then((r) => r.data),

  create: (data: PurchaseOrderCreatePayload) =>
    api.post<PurchaseOrder>('/suppliers/orders/', data).then((r) => r.data),

  update: (id: number, data: Partial<PurchaseOrderCreatePayload>) =>
    api
      .patch<PurchaseOrder>(`/suppliers/orders/${id}/`, data)
      .then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/suppliers/orders/${id}/`).then((r) => r.data),
};
