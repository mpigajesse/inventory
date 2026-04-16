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

export function StatCard({ label, value, change, changeType = "neutral", icon: Icon, animated = false, numericValue, animationDuration }: StatCardProps) {
  return (
    <div className="stat-card hover:scale-[1.02] hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <div className="stat-value">
        {animated && numericValue !== undefined
          ? <AnimatedValue numericValue={numericValue} animationDuration={animationDuration} />
          : value}
      </div>
      {change && (
        <p className={cn(
          "text-xs mt-1 font-medium",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </p>
      )}
    </div>
  );
}
