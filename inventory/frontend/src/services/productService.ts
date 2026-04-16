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
    api.get<{ results: Product[]; count: number }>('/products/', { params }).then(r => r.data),

  getById: (id: number) =>
    api.get<Product>(`/products/${id}/`).then(r => r.data),

  create: (data: FormData | Partial<Product>) =>
    api.post<Product>('/products/', data).then(r => r.data),

  update: (id: number, data: FormData | Partial<Product>) =>
    api.patch<Product>(`/products/${id}/`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/products/${id}/`).then(r => r.data),

  getByBarcode: (code: string) =>
    api.get<Product>(`/products/barcode/${code}/`).then(r => r.data),

  getCategories: () =>
    api.get<Category[]>('/products/categories/').then(r => r.data),

  createCategory: (data: Partial<Category>) =>
    api.post<Category>('/products/categories/', data).then(r => r.data),

  updateCategory: (id: number, data: Partial<Category>) =>
    api.patch<Category>(`/products/categories/${id}/`, data).then(r => r.data),

  deleteCategory: (id: number) =>
    api.delete(`/products/categories/${id}/`).then(r => r.data),
};
