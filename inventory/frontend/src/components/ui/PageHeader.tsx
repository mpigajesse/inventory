import { type ReactNode } from "react";
import { SearchInput } from "@/components/ui/SearchInput";

interface PageHeaderProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  action?: ReactNode;
}

export function PageHeader({ search, onSearchChange, searchPlaceholder, action }: PageHeaderProps) {
  const hasSearch = search !== undefined && onSearchChange !== undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      {hasSearch && (
        <SearchInput
          placeholder={searchPlaceholder}
          value={search}
          onChange={onSearchChange}
        />
      )}
      {action && (
        <div className="shrink-0 sm:ml-auto">
          {action}
        </div>
      )}
    </div>
  );
}
