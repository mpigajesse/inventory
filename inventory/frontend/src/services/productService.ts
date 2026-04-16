import { api } from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  description: string;
  product_count: number;
}

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  category: number;
  category_name: string;
  selling_price: number;
  purchase_price: number;
  image_url: string | null;
  stock_quantity: number;
  stock_status: 'normal' | 'bas' | 'critique';
  is_active: boolean;
}

export const productService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ results: Product[]; count: number }>('/products/', { params }),

  getById: (id: number) =>
    api.get<Product>(`/products/${id}/`),

  create: (data: FormData | Partial<Product>) =>
    api.post<Product>('/products/', data),

  update: (id: number, data: FormData | Partial<Product>) =>
    api.patch<Product>(`/products/${id}/`, data),

  delete: (id: number) =>
    api.delete(`/products/${id}/`),

  getByBarcode: (code: string) =>
    api.get<Product>(`/products/barcode/${code}/`),

  getCategories: () =>
    api.get<Category[]>('/products/categories/'),
};
