import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDisabled?: boolean;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
  showDisabled = false,
}: PermissionGateProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    if (showDisabled) {
      return (
        <div
          className="opacity-40 cursor-not-allowed pointer-events-none"
          title="Permission insuffisante"
        >
          {children}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
