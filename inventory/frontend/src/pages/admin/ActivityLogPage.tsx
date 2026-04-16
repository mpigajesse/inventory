import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableToolbar, exportToCsv } from "@/components/ui/TableToolbar";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useTableManager } from "@/hooks/useTableManager";
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
  dateSort: number; // timestamp pour le tri
  user: string;
  actionType: ActionType;
  action: string;
  detail: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_LOGS: LogEntry[] = [
  { id: "log-01", date: "14/04/2026 14:20", dateSort: 20260414_1420, user: "Fatou Mbaye", actionType: "vente", action: "Vente enregistrée", detail: "VNT-005 — 56 500 FCFA (4 articles)" },
  { id: "log-02", date: "14/04/2026 13:08", dateSort: 20260414_1308, user: "Moussa Diallo", actionType: "vente", action: "Vente enregistrée", detail: "VNT-004 — 23 000 FCFA (2 articles)" },
  { id: "log-03", date: "14/04/2026 11:42", dateSort: 20260414_1142, user: "Fatou Mbaye", actionType: "vente", action: "Vente enregistrée", detail: "VNT-003 — 78 000 FCFA (5 articles)" },
  { id: "log-04", date: "14/04/2026 11:30", dateSort: 20260414_1130, user: "Admin Principal", actionType: "stock", action: "Mise à jour stock", detail: "Lait Nido 400g : 12 → 3 unités" },
  { id: "log-05", date: "14/04/2026 10:15", dateSort: 20260414_1015, user: "Moussa Diallo", actionType: "vente", action: "Vente enregistrée", detail: "VNT-002 — 12 500 FCFA (1 article)" },
  { id: "log-06", date: "14/04/2026 09:00", dateSort: 20260414_0900, user: "Fatou Mbaye", actionType: "connexion", action: "Connexion", detail: "Session ouverte depuis 192.168.1.12" },
  { id: "log-07", date: "14/04/2026 08:45", dateSort: 20260414_0845, user: "Admin Principal", actionType: "produit", action: "Nouveau produit", detail: "Eau Tangui 1.5L ajouté au catalogue" },
  { id: "log-08", date: "14/04/2026 08:30", dateSort: 20260414_0830, user: "Admin Principal", actionType: "connexion", action: "Connexion", detail: "Session ouverte depuis 192.168.1.1" },
  { id: "log-09", date: "13/04/2026 18:45", dateSort: 20260413_1845, user: "Moussa Diallo", actionType: "connexion", action: "Déconnexion", detail: "Session fermée après 10h05" },
  { id: "log-10", date: "13/04/2026 17:00", dateSort: 20260413_1700, user: "Admin Principal", actionType: "produit", action: "Produit modifié", detail: "Huile Dinor 1L — prix : 2 500 → 2 700 FCFA" },
  { id: "log-11", date: "13/04/2026 15:30", dateSort: 20260413_1530, user: "Moussa Diallo", actionType: "vente", action: "Vente enregistrée", detail: "VNT-001 — 45 000 FCFA (3 articles)" },
  { id: "log-12", date: "13/04/2026 14:00", dateSort: 20260413_1400, user: "Admin Principal", actionType: "stock", action: "Mise à jour stock", detail: "Riz Uncle Ben's 5kg : 10 → 2 unités" },
  { id: "log-13", date: "13/04/2026 12:00", dateSort: 20260413_1200, user: "Système", actionType: "système", action: "Sauvegarde automatique", detail: "Sauvegarde complète effectuée avec succès" },
  { id: "log-14", date: "13/04/2026 10:20", dateSort: 20260413_1020, user: "Admin Principal", actionType: "produit", action: "Produit désactivé", detail: "Biscuits Belvita — stock épuisé" },
  { id: "log-15", date: "13/04/2026 09:15", dateSort: 20260413_0915, user: "Aïcha Nkoghe", actionType: "connexion", action: "Connexion", detail: "Session ouverte depuis 192.168.1.15" },
  { id: "log-16", date: "13/04/2026 08:00", dateSort: 20260413_0800, user: "Moussa Diallo", actionType: "connexion", action: "Connexion", detail: "Session ouverte depuis 192.168.1.10" },
  { id: "log-17", date: "12/04/2026 17:45", dateSort: 20260412_1745, user: "Système", actionType: "système", action: "Alerte stock bas", detail: "4 produits sous le seuil minimum" },
  { id: "log-18", date: "12/04/2026 16:30", dateSort: 20260412_1630, user: "Admin Principal", actionType: "stock", action: "Réapprovisionnement", detail: "Savon Palmolive : +50 unités reçues" },
  { id: "log-19", date: "12/04/2026 11:00", dateSort: 20260412_1100, user: "Admin Principal", actionType: "produit", action: "Nouveau produit", detail: "Biscuits Belvita — code-barres 8712345000012" },
  { id: "log-20", date: "12/04/2026 08:30", dateSort: 20260412_0830, user: "Admin Principal", actionType: "connexion", action: "Connexion", detail: "Session ouverte depuis 192.168.1.1" },
];

const ACTION_TYPE_OPTIONS = [
  { value: "vente", label: "Ventes" },
  { value: "stock", label: "Stock" },
  { value: "produit", label: "Produits" },
  { value: "connexion", label: "Connexions" },
  { value: "système", label: "Système" },
];

const USER_OPTIONS = [...new Set(MOCK_LOGS.map((l) => l.user))].map((u) => ({
  value: u,
  label: u,
}));

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

  // Pre-filter by type, user, and date before passing to useTableManager
  const preFiltered = useMemo(() => {
    return MOCK_LOGS.filter((entry) => {
      if (typeFilter && entry.actionType !== typeFilter) return false;
      if (userFilter && entry.user !== userFilter) return false;
      if (dateFilter) {
        // dateFilter is YYYY-MM-DD, date in DD/MM/YYYY
        const [day, month, year] = entry.date.split(" ")[0].split("/");
        const entryDate = `${year}-${month}-${day}`;
        if (entryDate !== dateFilter) return false;
      }
      return true;
    });
  }, [typeFilter, userFilter, dateFilter]);

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
              {totalItems} entrée{totalItems > 1 ? "s" : ""}
              {hasActiveFilters ? " (filtrées)" : ""}
            </span>
          </div>
        </div>

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
              {USER_OPTIONS.map((opt) => (
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
                {typedPaginated.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucune entrée ne correspond aux filtres sélectionnés.
                    </td>
                  </tr>
                )}
                {typedPaginated.map((entry) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile : card list */}
        <div className="md:hidden space-y-2">
          {typedPaginated.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune entrée ne correspond aux filtres sélectionnés.
            </div>
          )}
          {typedPaginated.map((entry) => (
            <div key={entry.id} className="bg-card border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <ActionTypeIcon type={entry.actionType} />
                  <span className="font-medium text-sm truncate">{entry.action}</span>
                </div>
                <StatusBadge
                  label={ACTION_CONFIG[entry.actionType].badge.label}
                  variant={ACTION_CONFIG[entry.actionType].badge.variant}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-1.5 truncate" title={entry.detail}>
                {entry.detail}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{entry.user}</span>
                <span className="whitespace-nowrap">{entry.date}</span>
              </div>
            </div>
          ))}
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
