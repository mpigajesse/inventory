import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ message, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0 mb-1">
          <span className="text-muted-foreground/60">{icon}</span>
        </div>
      )}
      <p className="font-semibold text-lg text-foreground leading-snug">{message}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-[36ch] leading-relaxed">{description}</p>
      )}
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </div>
  );
}
