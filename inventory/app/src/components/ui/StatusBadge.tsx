import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
  default: "bg-muted text-muted-foreground",
};

export function StatusBadge({ label, variant = "default" }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", variantStyles[variant])}>
      {label}
    </span>
  );
}
