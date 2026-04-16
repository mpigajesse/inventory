import { api } from '@/lib/api';
import type { Sale } from './salesService';

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  note: string;
  credit_balance: number;
  is_active: boolean;
  total_purchases: number;
  purchases_count: number;
  created_at: string;
}

export interface PaginatedClients {
  results: Client[];
  count: number;
}

export const clientService = {
  getAll: (params?: Record<string, string>) =>
    api
      .get<PaginatedClients>('/clients/', { params })
      .then((res) => res.data),

  getById: (id: number) =>
    api.get<Client>(`/clients/${id}/`).then((res) => res.data),

  create: (data: Partial<Client>) =>
    api.post<Client>('/clients/', data).then((res) => res.data),

  update: (id: number, data: Partial<Client>) =>
    api.patch<Client>(`/clients/${id}/`, data).then((res) => res.data),

  delete: (id: number) =>
    api.delete(`/clients/${id}/`).then((res) => res.data),

  getPurchases: (id: number) =>
    api.get<Sale[]>(`/clients/${id}/purchases/`).then((res) => res.data),
};
