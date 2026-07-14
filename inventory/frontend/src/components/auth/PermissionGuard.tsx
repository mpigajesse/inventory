import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Permission } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  /** Permission requise pour accéder à la route. L'admin passe toujours. */
  permission: Permission;
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Garde une route selon une permission granulaire (et non le rôle).
 * Aligne l'accès aux pages sur le même modèle que la sidebar (usePermissions).
 * L'admin a toutes les permissions ; un·e vendeur·se n'accède que si la
 * permission figure dans son profil.
 */
export function PermissionGuard({
  permission,
  children,
  redirectTo = '/vendeur/dashboard',
}: PermissionGuardProps) {
  const { currentUser, isLoading } = useAuth();
  const { can } = usePermissions();

  // État d'auth non résolu — éviter une redirection prématurée
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!can(permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
