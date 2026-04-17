import React from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default" | "muted";

interface StatusBadgeProps {
  variant?: BadgeVariant;
  // Support both legacy `label` prop and new `children`
  label?: string;
  children?: React.ReactNode;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; text: string; dotColor: string }
> = {
  success: {
    bg: "hsl(152 38% 38% / 0.1)",
    text: "hsl(152 38% 30%)",
    dotColor: "hsl(152 38% 38%)",
  },
  warning: {
    bg: "hsl(36 88% 52% / 0.12)",
    text: "hsl(36 70% 35%)",
    dotColor: "hsl(36 88% 52%)",
  },
  danger: {
    bg: "hsl(4 72% 52% / 0.1)",
    text: "hsl(4 72% 45%)",
    dotColor: "hsl(4 72% 52%)",
  },
  info: {
    bg: "hsl(210 70% 52% / 0.1)",
    text: "hsl(210 70% 42%)",
    dotColor: "hsl(210 70% 52%)",
  },
  default: {
    bg: "hsl(22 72% 48% / 0.1)",
    text: "hsl(22 72% 40%)",
    dotColor: "hsl(22 72% 48%)",
  },
  muted: {
    bg: "hsl(var(--muted))",
    text: "hsl(var(--muted-foreground))",
    dotColor: "hsl(var(--muted-foreground))",
  },
};

export function StatusBadge({
  variant = "default",
  label,
  children,
  dot = false,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const styles = VARIANT_STYLES[variant];
  const content = children ?? label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${className}`}
      style={{
        background: styles.bg,
        color: styles.text,
        padding: size === "sm" ? "0.125rem 0.5rem" : "0.25rem 0.75rem",
        fontSize: size === "sm" ? "0.6875rem" : "0.75rem",
        letterSpacing: "0.01em",
      }}
    >
      {dot && (
        <span
          className="rounded-full flex-shrink-0"
          style={{
            width: size === "sm" ? "5px" : "6px",
            height: size === "sm" ? "5px" : "6px",
            background: styles.dotColor,
          }}
        />
      )}
      {content}
    </span>
  );
}
