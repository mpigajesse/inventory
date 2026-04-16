import { useState, useMemo, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface SelectionState {
  selectedIds: Set<string | number>;
}

export interface UseTableManagerOptions<TRow> {
  initialPageSize?: number;
  searchKeys?: (keyof TRow)[];
  initialSort?: SortState;
}

export interface UseTableManagerResult<TRow> {
  // Données à différents stades du pipeline
  filtered: TRow[];
  paginated: TRow[];
  // Recherche
  search: string;
  setSearch: (value: string) => void;
  // Tri
  sort: SortState | null;
  toggleSort: (key: string) => void;
  // Sélection
  selectedIds: Set<string | number>;
  isSelected: (id: string | number) => boolean;
  toggleRow: (id: string | number) => void;
  toggleAll: (allIds: Array<string | number>) => void;
  clearSelection: () => void;
  isAllSelected: (allIds: Array<string | number>) => boolean;
  isIndeterminate: (allIds: Array<string | number>) => boolean;
  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  rangeStart: number;
  rangeEnd: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTableManager<TRow extends Record<string, unknown>>(
  data: TRow[],
  options: UseTableManagerOptions<TRow> = {}
): UseTableManagerResult<TRow> {
  const { initialPageSize = 10, searchKeys = [], initialSort } = options;

  const [search, setSearchRaw] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  // Réinitialise la page à 1 quand la recherche change
  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPageRaw(1);
  }, []);

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      })
    );
  }, [data, search, searchKeys]);

  // ── Tri ─────────────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sort.key as keyof TRow];
      const bVal = b[sort.key as keyof TRow];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal), "fr-FR");
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filtered, sort]);

  // ── Pagination ───────────────────────────────────────────────────────────────

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);

  // ── Actions pagination ───────────────────────────────────────────────────────

  const setPage = useCallback(
    (newPage: number) => {
      const clamped = Math.max(1, Math.min(newPage, totalPages));
      setPageRaw(clamped);
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1);
  }, []);

  // ── Actions tri ──────────────────────────────────────────────────────────────

  const toggleSort = useCallback(
    (key: string) => {
      setSort((prev) => {
        if (!prev || prev.key !== key) return { key, direction: "asc" };
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      });
      setPageRaw(1);
    },
    []
  );

  // ── Actions sélection ────────────────────────────────────────────────────────

  const isSelected = useCallback(
    (id: string | number) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleRow = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((allIds: Array<string | number>) => {
    setSelectedIds((prev) => {
      const allSelected = allIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useCallback(
    (allIds: Array<string | number>) =>
      allIds.length > 0 && allIds.every((id) => selectedIds.has(id)),
    [selectedIds]
  );

  const isIndeterminate = useCallback(
    (allIds: Array<string | number>) => {
      const count = allIds.filter((id) => selectedIds.has(id)).length;
      return count > 0 && count < allIds.length;
    },
    [selectedIds]
  );

  return {
    filtered: sorted,
    paginated,
    search,
    setSearch,
    sort,
    toggleSort,
    selectedIds,
    isSelected,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    page: safePage,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    rangeStart,
    rangeEnd,
  };
}
