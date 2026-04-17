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
  SlidersHorizontal,
  RotateCcw,
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

const ACTION_CONFIG: Record<
  ActionType,
  {
    icon: React.ElementType;
    bg: string;
    color: string;
    line: string;
    badge: { label: string; variant: "success" | "warning" | "info" | "default" | "danger" };
  }
> = {
  vente: {
    icon: ShoppingBag,
    bg: "bg-success/10",
    color: "text-success",
    line: "border-success/30",
    badge: { label: "Vente", variant: "success" },
  },
  stock: {
    icon: Package,
    bg: "bg-primary/10",
    color: "text-primary",
    line: "border-primary/30",
    badge: { label: "Stock", variant: "info" },
  },
  produit: {
    icon: Tag,
    bg: "bg-warning/10",
    color: "text-warning",
    line: "border-warning/30",
    badge: { label: "Produit", variant: "warning" },
  },
  connexion: {
    icon: LogIn,
    bg: "bg-muted",
    color: "text-muted-foreground",
    line: "border-border",
    badge: { label: "Connexion", variant: "default" },
  },
  système: {
    icon: Cpu,
    bg: "bg-muted",
    color: "text-muted-foreground",
    line: "border-border",
    badge: { label: "Système", variant: "default" },
  },
};

// ─── Timeline icon pill ───────────────────────────────────────────────────────

function ActionTypeIcon({ type }: { type: ActionType }) {
  const { icon: Icon, bg, color } = ACTION_CONFIG[type];
  // Use gradient for vente and produit/stock, keep muted for connexion/système
  const isColored = type === 'vente' || type === 'stock' || type === 'produit';
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-card ${isColored ? '' : bg}`}
      style={isColored ? {
        background: type === 'vente'
          ? 'linear-gradient(135deg, hsl(152 38% 38%), hsl(152 38% 48%))'
          : type === 'produit'
          ? 'linear-gradient(135deg, hsl(36 88% 52%), hsl(22 72% 48%))'
          : 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
      } : undefined}
    >
      <Icon className={`w-3.5 h-3.5 ${isColored ? 'text-white' : color}`} />
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
    queryKey: ["activity"],
    queryFn: () => activityService.getAll(),
  });

  const allLogs: LogEntry[] = useMemo(
    () => (data?.results ?? []).map(toLogEntry),
    [data]
  );

  const userOptions = useMemo(
    () => [...new Set(allLogs.map((l) => l.user))].map((u) => ({ value: u, label: u })),
    [allLogs]
  );

  const preFiltered = useMemo(() => {
    return allLogs.filter((entry) => {
      if (typeFilter && entry.actionType !== typeFilter) return false;
      if (userFilter && entry.user !== userFilter) return false;
      if (dateFilter) {
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

        {/* ── Page header premium ── */}
        <div className="page-header-premium flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))' }}
            >
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="page-header-eyebrow">Audit &amp; traçabilité</p>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))' }} />
                <h1 className="page-header-title">Journal d'activité</h1>
              </div>
              <p className="page-header-subtitle">
                {isLoading
                  ? "Chargement du journal…"
                  : isError
                  ? "Erreur de chargement"
                  : `${totalItems} entrée${totalItems !== 1 ? "s" : ""}${hasActiveFilters ? " (filtrées)" : ""} — historique complet des actions`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Erreur ── */}
        {isError && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive text-sm">
            <Activity className="w-4 h-4 shrink-0" />
            Impossible de charger le journal d'activité. Vérifiez votre connexion.
          </div>
        )}

        {/* ── Panneau filtres ── */}
        <div className="card-premium mb-4 p-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold font-heading">Filtres</span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Filtre type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Type d'action</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer min-w-[140px] transition-colors hover:border-primary/40"
              >
                <option value="">Tous les types</option>
                {ACTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filtre utilisateur */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Utilisateur</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer min-w-[160px] transition-colors hover:border-primary/40"
              >
                <option value="">Tous les utilisateurs</option>
                {userOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Filtre date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer transition-colors hover:border-primary/40"
              />
            </div>
          </div>
        </div>

        {/* ── Barre recherche + export ── */}
        <TableToolbar
          showExport
          onExport={handleExport}
          exportLabel="Exporter CSV"
          extraActions={
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans les actions..."
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px] transition-colors hover:border-primary/40"
            />
          }
        />

        {/* ── Desktop : tableau classique ── */}
        <div className="hidden md:block card-premium overflow-hidden mt-0">
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
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Activity className="w-4 h-4 animate-pulse text-primary" />
                        <span className="text-sm">Chargement…</span>
                      </div>
                    </td>
                  </tr>
                ) : typedPaginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      Aucune entrée ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                ) : (
                  typedPaginated.map((entry) => (
                    <tr
                      key={entry.id}
                      className="animate-fade-scale"
                    >
                      <td>
                        <ActionTypeIcon type={entry.actionType} />
                      </td>
                      <td>
                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {entry.date}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-sm font-heading">{entry.user}</span>
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
                      <td
                        className="text-muted-foreground text-xs max-w-xs truncate"
                        title={entry.detail}
                      >
                        {entry.detail}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Mobile : timeline groupée par date ── */}
        <div className="md:hidden mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
              <Activity className="w-4 h-4 animate-pulse text-primary" />
              Chargement…
            </div>
          ) : typedPaginated.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucune entrée ne correspond aux filtres sélectionnés.
            </div>
          ) : (
            <div className="space-y-0">
              {/* Grouper par date */}
              {(() => {
                const groups: Record<string, LogEntry[]> = {};
                typedPaginated.forEach((entry) => {
                  const dateKey = entry.date.split(" ")[0]; // DD/MM/YYYY
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(entry);
                });
                return Object.entries(groups).map(([dateKey, entries]) => (
                  <div key={dateKey}>
                    {/* Séparateur de date */}
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-xs font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                        {dateKey}
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>

                    {/* Entrées du groupe */}
                    <div
                      className="rounded-2xl overflow-hidden mb-2"
                      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    >
                      {entries.map((entry, idx) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-4 px-4 py-3.5 transition-colors animate-fade-scale"
                          style={{
                            borderBottom: idx < entries.length - 1 ? '1px solid hsl(var(--border) / 0.5)' : 'none',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(22 72% 48% / 0.02)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                          {/* Avatar utilisateur */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))' }}
                          >
                            {(entry.user?.[0] || 'S').toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-semibold">{entry.user}</span>
                              {' — '}{entry.detail || entry.action}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(entry.dateIso)}</p>
                          </div>

                          {/* Badge type */}
                          <StatusBadge
                            label={ACTION_CONFIG[entry.actionType].badge.label}
                            variant={ACTION_CONFIG[entry.actionType].badge.variant}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
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
