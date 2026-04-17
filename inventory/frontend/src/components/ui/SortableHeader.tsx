import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortState } from "@/hooks/useTableManager";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortState | null;
  onSort: (key: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
  style,
}: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  function renderIcon() {
    if (!isActive) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />;
    }
    if (direction === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 text-primary" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  }

  return (
    <th className={cn(className)} style={style}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        {renderIcon()}
      </button>
    </th>
  );
}
