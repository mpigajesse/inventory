import { type ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon && <div className="mb-3 opacity-30">{icon}</div>}
      <p className="text-sm">{message}</p>
    </div>
  );
}
