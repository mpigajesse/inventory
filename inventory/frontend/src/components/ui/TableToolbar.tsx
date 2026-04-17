import { type ReactNode, useRef } from "react";
import { Download, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterOption {
  value: string;
  label: string;
}

interface TableToolbarProps {
  // Sélection
  showCheckbox?: boolean;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleAll?: () => void;
  selectedCount?: number;
  bulkActions?: ReactNode;

  // Filtre colonne
  filterValue?: string;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  onFilterChange?: (value: string) => void;

  // Export
  showExport?: boolean;
  onExport?: () => void;
  exportLabel?: string;
  ExportIcon?: LucideIcon;

  // Slot actions supplémentaires (droite)
  extraActions?: ReactNode;

  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableToolbar({
  showCheckbox = false,
  isAllSelected = false,
  isIndeterminate = false,
  onToggleAll,
  selectedCount = 0,
  bulkActions,

  filterValue,
  filterOptions,
  filterPlaceholder = "Tous",
  onFilterChange,

  showExport = false,
  onExport,
  exportLabel = "Exporter CSV",
  ExportIcon = Download,

  extraActions,

  className,
}: TableToolbarProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Synchronise l'état indéterminé du DOM (non gérable via attribut JSX)
  if (checkboxRef.current) {
    checkboxRef.current.indeterminate = isIndeterminate;
  }

  const hasSelection = selectedCount > 0;
  const hasRightContent = filterOptions || showExport || extraActions;

  if (!showCheckbox && !hasRightContent) return null;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3",
        className
      )}
    >
      {/* Zone gauche : checkbox + compteur + actions bulk */}
      <div className="flex items-center gap-3">
        {showCheckbox && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={onToggleAll}
              className={cn(
                "h-4 w-4 rounded border-input accent-primary cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              )}
              aria-label="Tout sélectionner"
            />
            {hasSelection ? (
              <span className="text-xs font-medium text-primary">
                {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Tout sélectionner</span>
            )}
          </label>
        )}

        {/* Actions bulk — visibles seulement si sélection > 0 */}
        {hasSelection && bulkActions && (
          <div className="flex items-center gap-2 animate-fade-in">
            {bulkActions}
          </div>
        )}
      </div>

      {/* Zone droite : filtre + export + extras */}
      {hasRightContent && (
        <div className="flex items-center gap-2 sm:ml-auto">
          {filterOptions && onFilterChange && (
            <select
              value={filterValue ?? ""}
              onChange={(e) => onFilterChange(e.target.value)}
              className={cn(
                "h-8 rounded-md border border-input bg-background px-2 text-xs",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                "cursor-pointer min-w-[120px]"
              )}
            >
              <option value="">{filterPlaceholder}</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {showExport && onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                border: "none",
                boxShadow: "0 2px 8px hsl(22 72% 48% / 0.32)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 14px hsl(22 72% 48% / 0.48)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 2px 8px hsl(22 72% 48% / 0.32)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              <ExportIcon className="w-3.5 h-3.5" />
              {exportLabel}
            </button>
          )}

          {extraActions}
        </div>
      )}
    </div>
  );
}

// ─── Utilitaire export CSV ────────────────────────────────────────────────────

export function exportToCsv<TRow extends Record<string, unknown>>(
  data: TRow[],
  columns: Array<{ key: string; label: string }>,
  filename: string = "export"
): void {
  if (data.length === 0) return;

  const header = columns.map((c) => `"${c.label}"`).join(";");
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(";")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
