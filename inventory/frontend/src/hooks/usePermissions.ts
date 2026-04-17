import { useAuth } from '@/contexts/AuthContext';

export type Permission =
  | 'manage_users'
  | 'manage_products'
  | 'manage_stock'
  | 'view_reports'
  | 'manage_settings'
  | 'manage_suppliers'
  | 'view_barcodes'
  | 'make_sales'
  | 'view_invoices'
  | 'manage_clients';

interface UsePermissionsReturn {
  can: (permission: Permission) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { currentUser } = useAuth();

  function can(permission: Permission): boolean {
    if (!currentUser) {
      return false;
    }

    if (currentUser.role === 'admin') {
      return true;
    }

    // Vendeur: use real permissions stored on the user profile
    return (currentUser.permissions ?? []).includes(permission);
  }

  return { can };
}
