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
  orders_count: number;
  created_at: string;
}

export interface PaginatedSuppliers {
  results: Supplier[];
  count: number;
}

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
