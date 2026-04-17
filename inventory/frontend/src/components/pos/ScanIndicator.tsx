import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScanIndicatorProps {
  isActive?: boolean;
  lastScanned?: string;
  flash?: boolean;
  className?: string;
}

export function ScanIndicator({
  isActive = true,
  lastScanned,
  flash = false,
  className,
}: ScanIndicatorProps) {
  const [flashing, setFlashing] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!flash) return;

    if (flashTimeoutRef.current !== null) {
      clearTimeout(flashTimeoutRef.current);
    }

    setFlashing(true);

    flashTimeoutRef.current = setTimeout(() => {
      setFlashing(false);
      flashTimeoutRef.current = null;
    }, 600);

    return () => {
      if (flashTimeoutRef.current !== null) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [flash, lastScanned]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors duration-300",
        flashing
          ? "bg-green-500/15 text-green-300"
          : "text-[hsl(var(--sidebar-fg))]",
        className
      )}
      style={{
        backgroundColor: flashing
          ? undefined
          : "hsl(var(--sidebar-bg))",
      }}
      aria-live="polite"
      aria-label={
        isActive
          ? lastScanned
            ? `Scanner actif — dernier code : ${lastScanned}`
            : "Scanner actif"
          : "Scanner inactif"
      }
    >
      {/* Status dot */}
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full flex-shrink-0",
          isActive
            ? "bg-green-500 animate-pulse"
            : "bg-[hsl(var(--sidebar-fg))] opacity-40"
        )}
      />

      {/* Label */}
      <span className="font-medium">
        {isActive ? "Scanner actif" : "Scanner inactif"}
      </span>

      {/* Last scanned code */}
      {lastScanned && (
        <span className="font-mono text-xs opacity-75 truncate max-w-[120px]">
          → {lastScanned}
        </span>
      )}
    </div>
  );
}
