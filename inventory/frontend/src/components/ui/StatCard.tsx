import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  animated?: boolean;
  numericValue?: number;
  animationDuration?: number;
}

function AnimatedValue({ numericValue, animationDuration }: { numericValue: number; animationDuration?: number }) {
  const counted = useCountUp({ end: numericValue, duration: animationDuration ?? (numericValue >= 1000 ? 1200 : 800) });
  return <>{counted}</>;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  animated = false,
  numericValue,
  animationDuration,
}: StatCardProps) {
  return (
    <div className="stat-card hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <div className={cn("stat-value font-black tabular-nums")}>
        {animated && numericValue !== undefined ? (
          <AnimatedValue numericValue={numericValue} animationDuration={animationDuration} />
        ) : (
          value
        )}
      </div>
      {change && (
        <p
          className={cn(
            "text-xs mt-1 font-medium",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
