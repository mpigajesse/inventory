import { api } from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  description: string;
  product_count: number;
  created_at?: string;
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
  created_at?: string;
}

export interface ProductDetail extends Product {
  description: string | null;
  image: string | null;
  created_by: number | null;
  updated_at: string | null;
}

/** Build request config that lets multipart/form-data set its own Content-Type + boundary. */
function multipartConfig() {
  return { headers: { 'Content-Type': undefined as unknown as string } };
}

export const productService = {
  getAll: (params?: Record<string, string>) =>
    api.get<{ results: Product[]; count: number }>('/products/', { params }).then(r => r.data),

  getById: (id: number) =>
    api.get<ProductDetail>(`/products/${id}/`).then(r => r.data),

  create: (data: FormData | Partial<Product>) =>
    api
      .post<Product>('/products/', data, data instanceof FormData ? multipartConfig() : undefined)
      .then(r => r.data),

  update: (id: number, data: FormData | Partial<Product>) =>
    api
      .patch<Product>(`/products/${id}/`, data, data instanceof FormData ? multipartConfig() : undefined)
      .then(r => r.data),

  delete: (id: number) =>
    api.delete(`/products/${id}/`).then(r => r.data),

  getByBarcode: (code: string) =>
    api.get<Product>(`/products/barcode/${code}/`).then(r => r.data),

  generateBarcode: (id: number) =>
    api.post<Product>(`/products/${id}/generate-barcode/`).then(r => r.data),

  getCategories: () =>
    api.get<Category[]>('/products/categories/').then(r => r.data),

  createCategory: (data: Partial<Category>) =>
    api.post<Category>('/products/categories/', data).then(r => r.data),

  updateCategory: (id: number, data: Partial<Category>) =>
    api.patch<Category>(`/products/categories/${id}/`, data).then(r => r.data),

  deleteCategory: (id: number) =>
    api.delete(`/products/categories/${id}/`).then(r => r.data),

  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api
      .post<Product>(`/products/${id}/upload_image/`, formData, multipartConfig())
      .then(r => r.data);
  },
};
