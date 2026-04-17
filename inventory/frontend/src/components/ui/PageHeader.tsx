import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/SearchInput";

interface PageHeaderProps {
  /** Optional icon displayed to the left of the title block */
  icon?: LucideIcon;
  /** Page title rendered in heading style */
  title?: string;
  /** Secondary label rendered below the title */
  subtitle?: string;
  /** Search value — enables the search input when provided */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Slot for action buttons rendered on the right */
  action?: ReactNode;
  /** Adds a bottom border separator */
  separator?: boolean;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder,
  action,
  separator = false,
  className,
}: PageHeaderProps) {
  const hasSearch = search !== undefined && onSearchChange !== undefined;
  const hasTitleBlock = title || subtitle || Icon;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-3 mb-6",
        separator && "border-b border-border pb-4",
        className
      )}
    >
      {/* Left: icon + title block */}
      {hasTitleBlock && (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
          {(title || subtitle) && (
            <div className="min-w-0">
              {title && (
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {title}
                </p>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Centre: search input */}
      {hasSearch && (
        <div className={cn("w-full", hasTitleBlock ? "sm:max-w-xs" : "")}>
          <SearchInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={onSearchChange}
          />
        </div>
      )}

      {/* Right: action slot */}
      {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
    </div>
  );
}
