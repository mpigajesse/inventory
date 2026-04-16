import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableToolbar, exportToCsv } from "@/components/ui/TableToolbar";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useTableManager } from "@/hooks/useTableManager";
import { activityService } from "@/services/activityService";
import type { ActivityLog } from "@/services/activityService";
import {
  LogIn,
  ShoppingBag,
  Tag,
  Package,
  Cpu,
  Activity,
} from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionType = "vente" | "stock" | "produit" | "connexion" | "système";

interface LogEntry {
  id: string;
  date: string;
  dateIso: string;
  dateSort: number;
  user: string;
  actionType: ActionType;
  action: string;
  detail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveActionType(action: string, targetModel: string): ActionType {
  const model = targetModel?.toLowerCase() ?? "";
  const act = action?.toLowerCase() ?? "";

  if (model === "sale" || model === "saleitem") return "vente";
  if (model === "product") return "produit";
  if (model === "stock" || model === "stockmovement") return "stock";
  if (act === "login" || act === "logout") return "connexion";
  return "système";
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toLogEntry(log: ActivityLog): LogEntry {
  const actionType = resolveActionType(log.action, log.target_model);
  return {
    id: String(log.id),
    date: formatDate(log.created_at),
    dateIso: log.created_at,
    dateSort: new Date(log.created_at).getTime(),
    user: log.user_name,
    actionType,
    action: log.action,
    detail: log.description,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_TYPE_OPTIONS = [
  { value: "vente", label: "Ventes" },
  { value: "stock", label: "Stock" },
  { value: "produit", label: "Produits" },
  { value: "connexion", label: "Connexions" },
  { value: "système", label: "Système" },
];

const CSV_COLUMNS = [
  { key: "date", label: "Date / Heure" },
  { key: "user", label: "Utilisateur" },
  { key: "actionType", label: "Type" },
  { key: "action", label: "Action" },
  { key: "detail", label: "Détail" },
];

// ─── Action type config ───────────────────────────────────────────────────────

const ACTION_CONFIG: Record<ActionType, { icon: React.ElementType; bg: string; color: string; badge: { label: string; variant: "success" | "warning" | "info" | "default" | "danger" } }> = {
  vente: { icon: ShoppingBag, bg: "bg-success/10", color: "text-success", badge: { label: "Vente", variant: "success" } },
  stock: { icon: Package, bg: "bg-primary/10", color: "text-primary", badge: { label: "Stock", variant: "info" } },
  produit: { icon: Tag, bg: "bg-warning/10", color: "text-warning", badge: { label: "Produit", variant: "warning" } },
  connexion: { icon: LogIn, bg: "bg-muted", color: "text-muted-foreground", badge: { label: "Connexion", variant: "default" } },
  système: { icon: Cpu, bg: "bg-muted", color: "text-muted-foreground", badge: { label: "Système", variant: "default" } },
};

function ActionTypeIcon({ type }: { type: ActionType }) {
  const { icon: Icon, bg, color } = ACTION_CONFIG[type];
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();

  const [typeFilter, setTypeFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity'],
    queryFn: () => activityService.getAll(),
  });

  // Map API logs to display entries
  const allLogs: LogEntry[] = useMemo(
    () => (data?.results ?? []).map(toLogEntry),
    [data]
  );

  // Derive unique user options from loaded data
  const userOptions = useMemo(
    () => [...new Set(allLogs.map((l) => l.user))].map((u) => ({ value: u, label: u })),
    [allLogs]
  );

  // Pre-filter by type, user, and date before passing to useTableManager
  const preFiltered = useMemo(() => {
    return allLogs.filter((entry) => {
      if (typeFilter && entry.actionType !== typeFilter) return false;
      if (userFilter && entry.user !== userFilter) return false;
      if (dateFilter) {
        // dateFilter is YYYY-MM-DD, date in DD/MM/YYYY HH:MM
        const [day, month, year] = entry.date.split(" ")[0].split("/");
        const entryDate = `${year}-${month}-${day}`;
        if (entryDate !== dateFilter) return false;
      }
      return true;
    });
  }, [allLogs, typeFilter, userFilter, dateFilter]);

  const {
    paginated,
    sort,
    toggleSort,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    rangeStart,
    rangeEnd,
    setSearch,
    search,
  } = useTableManager(preFiltered as unknown as Record<string, unknown>[], {
    initialSort: { key: "dateSort", direction: "desc" },
    searchKeys: ["action", "detail", "user"] as never[],
  });

  const typedPaginated = paginated as unknown as LogEntry[];

  function handleExport() {
    exportToCsv(preFiltered, CSV_COLUMNS, "journal-activite");
  }

  function handleResetFilters() {
    setTypeFilter("");
    setUserFilter("");
    setDateFilter("");
    setSearch("");
  }

  const hasActiveFilters = typeFilter || userFilter || dateFilter || search;

  return (
    <>
      <Topbar
        title="Journal d'activité"
        subtitle="Historique complet des actions système"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {isLoading
                ? "Chargement…"
                : isError
                ? "Erreur de chargement"
                : `${totalItems} entrée${totalItems > 1 ? "s" : ""}${hasActiveFilters ? " (filtrées)" : ""}`}
            </span>
          </div>
        </div>

        {isError && (
          <p className="text-sm text-destructive mb-4">
            Impossible de charger le journal d'activité. Vérifiez votre connexion.
          </p>
        )}

        {/* ── Filtres ── */}
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-card border rounded-lg">
          {/* Filtre type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Type d'action</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer min-w-[140px]"
            >
              <option value="">Tous les types</option>
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Filtre utilisateur */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Utilisateur</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer min-w-[160px]"
            >
              <option value="">Tous les utilisateurs</option>
              {userOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Filtre date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            />
          </div>

          {/* Réinitialiser */}
          {hasActiveFilters && (
            <div className="flex flex-col justify-end">
              <button
                onClick={handleResetFilters}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-input rounded-md transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>

        {/* ── Barre d'outils (recherche + export) ── */}
        <TableToolbar
          showExport
          onExport={handleExport}
          exportLabel="Exporter CSV"
          extraActions={
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les actions..."
              className="h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
            />
          }
        />

        {/* Desktop : tableau normal */}
        <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">Type</th>
                  <SortableHeader label="Date / Heure" sortKey="dateSort" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Utilisateur" sortKey="user" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Action" sortKey="action" currentSort={sort} onSort={toggleSort} />
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Chargement…
                    </td>
                  </tr>
                ) : typedPaginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucune entrée ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                ) : (
                  typedPaginated.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <ActionTypeIcon type={entry.actionType} />
                      </td>
                      <td className="text-muted-foreground text-xs whitespace-nowrap">{entry.date}</td>
                      <td>
                        <span className="font-medium text-sm">{entry.user}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            label={ACTION_CONFIG[entry.actionType].badge.label}
                            variant={ACTION_CONFIG[entry.actionType].badge.variant}
                          />
                          <span className="text-sm">{entry.action}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground text-xs max-w-xs truncate" title={entry.detail}>
                        {entry.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile : card list — md:hidden */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Chargement…</div>
          ) : typedPaginated.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune entrée ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            typedPaginated.map((entry) => (
              <div
                key={entry.id}
                className="bg-card border rounded-xl p-4 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <ActionTypeIcon type={entry.actionType} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" title={entry.detail}>
                      {entry.detail || entry.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <span className="text-xs text-foreground/80 truncate">{entry.user}</span>
                      <span
                        className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
                        title={entry.date}
                      >
                        · {formatRelative(entry.dateIso)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge
                    label={ACTION_CONFIG[entry.actionType].badge.label}
                    variant={ACTION_CONFIG[entry.actionType].badge.variant}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

      </div>
    </>
  );
}
