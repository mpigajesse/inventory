import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TablePaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPageNumbers(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [];

  pages.push(1);

  if (page > 4) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (page < totalPages - 3) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);

  return pages;
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

export function TablePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 px-1 text-sm">
      {/* Texte d'affichage */}
      <p className="text-muted-foreground text-xs shrink-0">
        Affichage{" "}
        <span className="font-medium text-foreground">{rangeStart}–{rangeEnd}</span>
        {" "}sur{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
        {" "}résultat{totalItems > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-3">
        {/* Sélecteur taille de page */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Par page :</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              "h-8 rounded-md border border-input bg-background px-2 text-xs",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              "cursor-pointer"
            )}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation numérotée */}
        {totalPages > 1 && (
          <nav className="flex items-center gap-0.5" aria-label="Navigation de pages">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              aria-label="Page précédente"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                page === 1
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((p, idx) => {
              if (p === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-8 w-8 items-center justify-center text-muted-foreground text-xs"
                    aria-hidden
                  >
                    …
                  </span>
                );
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Page suivante"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                page === totalPages
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
