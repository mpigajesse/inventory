import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon | React.ElementType;
  // Legacy props (backward compat)
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  animated?: boolean;
  numericValue?: number;
  animationDuration?: number;
  // New premium props
  trend?: number | null;
  trendLabel?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  isAmount?: boolean;
  subValue?: string;
  className?: string;
}

function AnimatedValue({
  numericValue,
  animationDuration,
}: {
  numericValue: number;
  animationDuration?: number;
}) {
  const counted = useCountUp({
    end: numericValue,
    duration: animationDuration ?? (numericValue >= 1000 ? 1200 : 800),
  });
  return <>{counted}</>;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  animated = false,
  numericValue,
  animationDuration,
  trend,
  trendLabel = "vs période préc.",
  variant = "default",
  isAmount = false,
  subValue,
  className = "",
}: StatCardProps) {
  const variantConfig = {
    default: {
      iconBg: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
      iconShadow: "hsl(22 72% 48% / 0.3)",
      glow: "hsl(22 72% 48% / 0.06)",
    },
    primary: {
      iconBg: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
      iconShadow: "hsl(22 72% 48% / 0.3)",
      glow: "hsl(22 72% 48% / 0.06)",
    },
    success: {
      iconBg: "linear-gradient(135deg, hsl(152 38% 38%), hsl(152 45% 45%))",
      iconShadow: "hsl(152 38% 38% / 0.3)",
      glow: "hsl(152 38% 38% / 0.05)",
    },
    warning: {
      iconBg: "linear-gradient(135deg, hsl(36 88% 48%), hsl(36 88% 55%))",
      iconShadow: "hsl(36 88% 52% / 0.3)",
      glow: "hsl(36 88% 52% / 0.06)",
    },
    danger: {
      iconBg: "linear-gradient(135deg, hsl(4 72% 48%), hsl(4 72% 55%))",
      iconShadow: "hsl(4 72% 52% / 0.3)",
      glow: "hsl(4 72% 52% / 0.05)",
    },
  };

  const config = variantConfig[variant];

  // Derive trend from legacy changeType if trend prop not provided
  const effectiveTrend =
    trend !== undefined
      ? trend
      : change && changeType !== "neutral"
      ? changeType === "positive"
        ? 1
        : -1
      : null;

  // Use legacy change label when no trendLabel and change prop is present
  const effectiveTrendLabel =
    trend !== undefined ? trendLabel : change ?? trendLabel;

  // For legacy change display (when trend prop not used), show the raw change string
  const showLegacyChange =
    trend === undefined && change && changeType !== undefined;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${className}`}
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow:
          "0 2px 8px hsl(22 30% 15% / 0.06), 0 8px 24px hsl(22 30% 15% / 0.04)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow =
          "0 8px 24px hsl(22 30% 15% / 0.1), 0 16px 48px hsl(22 30% 15% / 0.07)";
        el.style.borderColor = "hsl(22 72% 48% / 0.25)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(0)";
        el.style.boxShadow =
          "0 2px 8px hsl(22 30% 15% / 0.06), 0 8px 24px hsl(22 30% 15% / 0.04)";
        el.style.borderColor = "hsl(var(--border))";
      }}
    >
      {/* Orbe de fond décoratif */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Header: icon + trend badge */}
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: config.iconBg,
              boxShadow: `0 4px 12px ${config.iconShadow}`,
            }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}

        {effectiveTrend !== null &&
          effectiveTrend !== undefined &&
          trend !== undefined && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
              style={{
                background:
                  effectiveTrend >= 0
                    ? "hsl(152 38% 38% / 0.1)"
                    : "hsl(4 72% 52% / 0.1)",
                color:
                  effectiveTrend >= 0
                    ? "hsl(152 38% 38%)"
                    : "hsl(4 72% 52%)",
              }}
            >
              <span>{effectiveTrend >= 0 ? "↑" : "↓"}</span>
              <span>{Math.abs(effectiveTrend).toFixed(1)}%</span>
            </div>
          )}
      </div>

      {/* Valeur principale */}
      <p
        className="text-3xl font-bold text-foreground leading-none mb-1"
        style={
          isAmount
            ? {
                fontFamily: "Fraunces, Georgia, serif",
                letterSpacing: "-0.03em",
                fontSize:
                  typeof value === "string" && value.length > 8
                    ? "1.75rem"
                    : "2rem",
              }
            : { letterSpacing: "-0.02em" }
        }
      >
        {animated && numericValue !== undefined ? (
          <AnimatedValue
            numericValue={numericValue}
            animationDuration={animationDuration}
          />
        ) : (
          value
        )}
      </p>

      {/* Sous-valeur */}
      {subValue && (
        <p className="text-xs text-muted-foreground font-medium mb-1">
          {subValue}
        </p>
      )}

      {/* Label + trend/change label */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        {showLegacyChange && trend === undefined && (
          <p
            className={`text-xs font-medium ${
              changeType === "positive"
                ? "text-[hsl(152_38%_38%)]"
                : changeType === "negative"
                ? "text-[hsl(4_72%_52%)]"
                : "text-muted-foreground"
            }`}
          >
            {change}
          </p>
        )}
        {trend !== undefined &&
          trend !== null &&
          effectiveTrendLabel && (
            <p className="text-xs text-muted-foreground/60">
              {effectiveTrendLabel}
            </p>
          )}
      </div>
    </div>
  );
}
