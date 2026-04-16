import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { UserRole } from '@/contexts/AuthContext';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const hasAccess = currentUser !== null && allowedRoles.includes(currentUser.role);

  useEffect(() => {
    if (!hasAccess) {
      toast({
        title: 'Accès non autorisé',
        description: "Vous n'avez pas les droits nécessaires pour accéder à cette page.",
        variant: 'destructive',
      });
      navigate('/dashboard', { replace: true });
    }
  }, [hasAccess, navigate]);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
