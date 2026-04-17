import { useState, useMemo, useEffect, useRef } from "react";
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
type DateFilterId = "today" | "yesterday" | "week" | "month" | "";

interface LogEntry {
  id: string;
  date: string;
  dateIso: string;
  dateSort: number;
  user: string;
  userId: string;
  actionType: ActionType;
  action: string;
  detail: string;
  saleAmount: number | null;
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
    user: log.user_name ?? "—",
    userId: String(log.user ?? ""),
    actionType,
    action: log.action,
    detail: log.description,
    saleAmount: log.sale_amount,
  };
}

function formatSecondsAgo(seconds: number): string {
  if (seconds < 5) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds} sec`;
  const m = Math.floor(seconds / 60);
  return `il y a ${m} min`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_FILTERS: { id: DateFilterId; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "yesterday", label: "Hier" },
  { id: "week", label: "7 jours" },
  { id: "month", label: "30 jours" },
  { id: "", label: "Tout" },
];

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
    gradient: string;
    avatarGradient: string;
  }
> = {
  vente: {
    icon: ShoppingBag,
    bg: "bg-success/10",
    color: "text-success",
    line: "border-success/30",
    badge: { label: "Vente", variant: "success" },
    gradient: "linear-gradient(135deg, hsl(152 38% 32%), hsl(152 38% 44%))",
    avatarGradient: "linear-gradient(135deg, hsl(152 38% 32%), hsl(152 38% 48%))",
  },
  stock: {
    icon: Package,
    bg: "bg-primary/10",
    color: "text-primary",
    line: "border-primary/30",
    badge: { label: "Stock", variant: "info" },
    gradient: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
    avatarGradient: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
  },
  produit: {
    icon: Tag,
    bg: "bg-warning/10",
    color: "text-warning",
    line: "border-warning/30",
    badge: { label: "Produit", variant: "warning" },
    gradient: "linear-gradient(135deg, hsl(36 88% 48%), hsl(22 72% 52%))",
    avatarGradient: "linear-gradient(135deg, hsl(36 88% 44%), hsl(22 72% 54%))",
  },
  connexion: {
    icon: LogIn,
    bg: "bg-muted",
    color: "text-muted-foreground",
    line: "border-border",
    badge: { label: "Connexion", variant: "default" },
    gradient: "linear-gradient(135deg, hsl(215 20% 48%), hsl(215 30% 58%))",
    avatarGradient: "linear-gradient(135deg, hsl(215 20% 44%), hsl(215 30% 56%))",
  },
  système: {
    icon: Cpu,
    bg: "bg-muted",
    color: "text-muted-foreground",
    line: "border-border",
    badge: { label: "Système", variant: "default" },
    gradient: "linear-gradient(135deg, hsl(215 15% 42%), hsl(215 20% 54%))",
    avatarGradient: "linear-gradient(135deg, hsl(215 15% 40%), hsl(215 20% 52%))",
  },
};

// ─── Copper badge style ───────────────────────────────────────────────────────

const copperBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "hsl(22 72% 48%)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 100,
  padding: "1px 8px",
  letterSpacing: "0.03em",
  whiteSpace: "nowrap",
};

// ─── Timeline icon pill ───────────────────────────────────────────────────────

function ActionTypeIcon({ type }: { type: ActionType }) {
  const { icon: Icon, bg, color, gradient } = ACTION_CONFIG[type];
  const isColored = type === 'vente' || type === 'stock' || type === 'produit';
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${isColored ? '' : bg}`}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        padding: 8,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ...(isColored ? {
          background: gradient,
          boxShadow: '0 2px 8px hsl(0 0% 0% / 0.12)',
        } : {
          boxShadow: '0 1px 4px hsl(0 0% 0% / 0.06)',
        }),
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px hsl(0 0% 0% / 0.18)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isColored
          ? '0 2px 8px hsl(0 0% 0% / 0.12)'
          : '0 1px 4px hsl(0 0% 0% / 0.06)';
      }}
    >
      <Icon style={{ width: 16, height: 16 }} className={isColored ? 'text-white' : color} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();

  const [typeFilter, setTypeFilter] = useState("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilterId>("today");

  // Refresh indicator state
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const lastFetchRef = useRef<number>(Date.now());

  // Build query params for the API
  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (dateFilter) p["date"] = dateFilter;
    if (userFilter) p["user_id"] = userFilter;
    return p;
  }, [dateFilter, userFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity", dateFilter, userFilter],
    queryFn: () => {
      lastFetchRef.current = Date.now();
      setSecondsSinceUpdate(0);
      return activityService.getAll(queryParams);
    },
    refetchInterval: 30_000,
  });

  // Tick every second for the "last updated X sec ago" label
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastFetchRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const allLogs: LogEntry[] = useMemo(
    () => (data?.results ?? []).map(toLogEntry),
    [data]
  );

  // User pill options — derived from current result set
  const userOptions = useMemo(
    () =>
      [...new Map(allLogs.map((l) => [l.userId, l.user])).entries()]
        .filter(([uid]) => uid !== "")
        .map(([uid, name]) => ({ value: uid, label: name })),
    [allLogs]
  );

  const preFiltered = useMemo(() => {
    return allLogs.filter((entry) => {
      if (typeFilter && entry.actionType !== typeFilter) return false;
      return true;
    });
  }, [allLogs, typeFilter]);

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
    setDateFilter("today");
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

          {/* ── Refresh indicator ── */}
          {!isLoading && !isError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                background: "hsl(var(--muted))",
                borderRadius: 100,
                padding: "4px 12px",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "hsl(152 38% 44%)",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }}
              />
              Dernière mise à jour : {formatSecondsAgo(secondsSinceUpdate)}
            </div>
          )}
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

          {/* ── Date quick-filter pills ── */}
          <div className="flex flex-wrap gap-2 mb-3">
            {DATE_FILTERS.map((f) => {
              const isActive = dateFilter === f.id;
              return (
                <button
                  key={String(f.id)}
                  onClick={() => setDateFilter(f.id)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 14px",
                    borderRadius: 100,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.15s ease, color 0.15s ease",
                    background: isActive ? "hsl(22 72% 48%)" : "hsl(var(--muted))",
                    color: isActive ? "#fff" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
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

            {/* ── Vendeur filter pills ── */}
            {userOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Vendeur·se</label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <button
                    onClick={() => setUserFilter("")}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 12px",
                      borderRadius: 100,
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s ease, color 0.15s ease",
                      background: userFilter === "" ? "hsl(22 72% 48%)" : "hsl(var(--muted))",
                      color: userFilter === "" ? "#fff" : "hsl(var(--muted-foreground))",
                      height: 28,
                    }}
                  >
                    Tous
                  </button>
                  {userOptions.map((opt) => {
                    const isActive = userFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setUserFilter(isActive ? "" : opt.value)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 12px",
                          borderRadius: 100,
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.15s ease, color 0.15s ease",
                          background: isActive ? "hsl(22 72% 48%)" : "hsl(var(--muted))",
                          color: isActive ? "#fff" : "hsl(var(--muted-foreground))",
                          height: 28,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
            <table className="data-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th
                    className="w-10"
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      background: 'hsl(30 15% 95%)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    Type
                  </th>
                  <SortableHeader
                    label="Date / Heure"
                    sortKey="dateSort"
                    currentSort={sort}
                    onSort={toggleSort}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      background: 'hsl(30 15% 95%)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                    } as React.CSSProperties}
                  />
                  <SortableHeader
                    label="Utilisateur"
                    sortKey="user"
                    currentSort={sort}
                    onSort={toggleSort}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      background: 'hsl(30 15% 95%)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                    } as React.CSSProperties}
                  />
                  <SortableHeader
                    label="Action"
                    sortKey="action"
                    currentSort={sort}
                    onSort={toggleSort}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      background: 'hsl(30 15% 95%)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                    } as React.CSSProperties}
                  />
                  <th
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      background: 'hsl(30 15% 95%)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    Détail
                  </th>
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
                  typedPaginated.map((entry, index) => (
                    <tr
                      key={entry.id}
                      style={{
                        opacity: 0,
                        transform: 'translateY(5px)',
                        animation: `activityRowIn 0.3s ease forwards`,
                        animationDelay: `${index * 35}ms`,
                        transition: 'background 0.15s ease',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'hsl(22 72% 48% / 0.04)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                      }}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge
                            label={ACTION_CONFIG[entry.actionType].badge.label}
                            variant={ACTION_CONFIG[entry.actionType].badge.variant}
                          />
                          <span className="text-sm">{entry.action}</span>
                          {entry.saleAmount != null && (
                            <span style={copperBadgeStyle}>
                              {entry.saleAmount.toLocaleString("fr-FR")} FCFA
                            </span>
                          )}
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
                return Object.entries(groups).map(([dateKey, entries], groupIndex) => (
                  <div key={dateKey}>
                    {/* Séparateur de date */}
                    <div className="flex items-center gap-3 py-3">
                      <div
                        className="flex-1 h-px bg-border/60"
                        style={{
                          transformOrigin: 'left',
                          transform: 'scaleX(0)',
                          animation: 'dateDividerIn 400ms ease forwards',
                          animationDelay: `${groupIndex * 80}ms`,
                        }}
                      />
                      <span
                        className="text-xs font-bold"
                        style={{
                          background: 'hsl(22 72% 48% / 0.1)',
                          color: 'hsl(22 72% 48%)',
                          borderRadius: 100,
                          padding: '2px 10px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {dateKey}
                      </span>
                      <div
                        className="flex-1 h-px bg-border/60"
                        style={{
                          transformOrigin: 'left',
                          transform: 'scaleX(0)',
                          animation: 'dateDividerIn 400ms ease forwards',
                          animationDelay: `${groupIndex * 80 + 50}ms`,
                        }}
                      />
                    </div>

                    {/* Entrées du groupe */}
                    <div
                      className="rounded-2xl overflow-hidden mb-2"
                      style={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        opacity: 0,
                        transform: 'translateX(-6px)',
                        animation: 'mobileGroupIn 0.35s ease forwards',
                        animationDelay: `${groupIndex * 80}ms`,
                      }}
                    >
                      {entries.map((entry, idx) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-4 px-4 py-3.5 transition-colors"
                          style={{
                            borderBottom: idx < entries.length - 1 ? '1px solid hsl(var(--border) / 0.5)' : 'none',
                            opacity: 0,
                            animation: 'mobileRowIn 0.3s ease forwards',
                            animationDelay: `${groupIndex * 80 + idx * 30}ms`,
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(22 72% 48% / 0.02)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                          {/* Avatar utilisateur — gradient selon action type */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: ACTION_CONFIG[entry.actionType].avatarGradient }}
                          >
                            {(entry.user?.[0] || 'S').toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-semibold">{entry.user}</span>
                              {' — '}{entry.detail || entry.action}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-xs text-muted-foreground">{formatRelative(entry.dateIso)}</p>
                              {entry.saleAmount != null && (
                                <span style={copperBadgeStyle}>
                                  {entry.saleAmount.toLocaleString("fr-FR")} FCFA
                                </span>
                              )}
                            </div>
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
