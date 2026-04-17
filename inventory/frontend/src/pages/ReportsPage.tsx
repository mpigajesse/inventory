import React from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/AccessDenied";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  BarChart2,
  Trophy,
  Download,
  Calendar,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { dashboardService } from "@/services/dashboardService";
import { stockService } from "@/services/stockService";
import { clientService } from "@/services/clientService";
import { productService } from "@/services/productService";
import { salesService } from "@/services/salesService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { exportReportToExcel } from "@/lib/exportReport";
import { exportClients } from "@/lib/exportClients";
import { exportProductsStockReport } from "@/lib/exportProductsStock";
import { exportWeeklySales } from "@/lib/exportSales";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return `${amount} FCFA`;
}

/** Converts ISO date "2024-01-17" → "17/01" for compact bar chart labels */
function formatDayLabel(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return isoDate;
}

// ─── Skeleton bar loader ───────────────────────────────────────────────────────

function SkeletonBar({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="h-4 rounded skeleton-shimmer"
      style={{ width }}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { can } = usePermissions();
  const [isExportingClients, setIsExportingClients] = React.useState(false);
  const [isExportingProducts, setIsExportingProducts] = React.useState(false);
  const [isExportingSales, setIsExportingSales] = React.useState(false);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardService.getStats,
    enabled: can('view_reports'),
  });

  const { data: alertsData } = useQuery({
    queryKey: ["stockAlerts"],
    queryFn: stockService.getAlerts,
    enabled: can('view_reports'),
  });

  if (!can('view_reports')) {
    return (
      <AccessDenied message="Vous n'avez pas la permission de consulter les rapports." />
    );
  }

  const stockAlerts = alertsData ?? [];

  const salesByDay = stats?.sales_by_day ?? [];
  const topProducts = stats?.top_products ?? [];
  const maxSale = salesByDay.length > 0 ? Math.max(...salesByDay.map((d) => d.total)) : 1;

  const weekRevenue = salesByDay.reduce((sum, d) => sum + d.total, 0);
  const weekTransactions = salesByDay.reduce((sum, d) => sum + d.count, 0);
  const avgBasket = weekTransactions > 0 ? Math.round(weekRevenue / weekTransactions) : 0;
  const totalClients = stats?.clients.total ?? 0;

  return (
    <>
      <Topbar title="Rapports" subtitle="Statistiques de ventes et performances" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* ── Page header premium ── */}
        <div className="page-header-premium">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="page-header-eyebrow">Analyse &amp; performances</p>
              <h1 className="page-header-title">Rapports</h1>
              <p className="page-header-subtitle">
                Ventes hebdomadaires, produits phares et tendances de votre activité
              </p>
            </div>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Ventes semaine"
            value={isLoading ? "—" : formatFcfa(weekRevenue)}
            icon={DollarSign}
          />
          <StatCard
            label="Transactions"
            value={isLoading ? "—" : String(weekTransactions)}
            icon={ShoppingCart}
          />
          <StatCard
            label="Panier moyen"
            value={isLoading ? "—" : formatFcfa(avgBasket)}
            icon={TrendingUp}
          />
          <StatCard
            label="Clients actifs"
            value={isLoading ? "—" : String(totalClients)}
            icon={Users}
          />
        </div>

        {/* ── Erreur ── */}
        {isError && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive text-sm">
            <TrendingUp className="w-4 h-4 shrink-0" />
            Impossible de charger les données. Vérifiez votre connexion.
          </div>
        )}

        {/* ── Grille principale ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Graphique barres — ventes par jour */}
          <div className="card-premium p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold font-heading">Ventes par jour</h2>
                  <p className="text-xs text-muted-foreground">Cette semaine</p>
                </div>
              </div>
              {!isLoading && weekRevenue > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-1 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  {formatFcfa(weekRevenue)}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="h-48 flex items-end gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md skeleton-shimmer"
                      style={{ height: `${30 + Math.random() * 60}%` }}
                    />
                    <SkeletonBar width="60%" />
                  </div>
                ))}
              </div>
            ) : salesByDay.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <BarChart2 className="w-8 h-8 opacity-25" />
                <p className="text-sm">Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="flex items-end gap-2 sm:gap-3 h-48">
                {salesByDay.map((d, i) => {
                  const heightPct = Math.max(4, (d.total / maxSale) * 100);
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-2 group"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="text-[10px] text-muted-foreground font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : String(d.total)}
                      </span>
                      <div
                        className="relative w-full rounded-t-lg transition-all duration-300 cursor-default group-hover:brightness-110"
                        style={{
                          height: `${heightPct}%`,
                          background: "var(--gradient-primary)",
                          opacity: d.total === 0 ? 0.2 : 0.85,
                        }}
                      >
                        {/* Shine overlay */}
                        <div className="absolute inset-0 rounded-t-lg bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">{formatDayLabel(d.day)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top produits */}
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold font-heading">Top produits</h2>
                  <p className="text-xs text-muted-foreground">Les plus vendus</p>
                </div>
              </div>
              {!isLoading && topProducts.length > 0 && (
                <span className="text-xs text-muted-foreground">{topProducts.length} produits</span>
              )}
            </div>

            <div className="p-5 space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBar width="24px" />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonBar width="70%" />
                      <SkeletonBar width="40%" />
                    </div>
                    <SkeletonBar width="80px" />
                  </div>
                ))
              ) : topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 opacity-25" />
                  <p className="text-sm">Aucune donnée disponible</p>
                </div>
              ) : (
                topProducts.map((p, i) => {
                  const maxRevenue = topProducts[0]?.revenue ?? 1;
                  const barPct = Math.max(4, (p.revenue / maxRevenue) * 100);
                  return (
                    <div
                      key={p.product__name}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors animate-fade-scale"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {/* Rang */}
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0
                            ? "bg-warning/15 text-warning"
                            : i === 1
                            ? "bg-muted text-muted-foreground"
                            : i === 2
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>

                      {/* Nom + barre de progression */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate font-heading">{p.product__name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${barPct}%`,
                                background: i === 0 ? "hsl(var(--warning))" : "var(--gradient-primary)",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {p.total_sold} vendus
                          </span>
                        </div>
                      </div>

                      {/* Revenu */}
                      <span className="text-sm font-semibold shrink-0 text-right font-editorial amount-editorial">
                        {formatFcfa(p.revenue)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Section exports ── */}
        <div className="mt-5 card-premium p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Download className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="text-sm font-semibold font-heading">Exports &amp; rapports</h2>
                <p className="text-xs text-muted-foreground">Téléchargez vos données au format Excel</p>
              </div>
            </div>
            <button
              disabled={!stats || isLoading || !can('view_reports')}
              onClick={() => {
                if (stats) {
                  exportReportToExcel({ stats, stockAlerts });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Download className="w-4 h-4" />
              Télécharger rapport complet
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Ventes de la semaine */}
            <button
              disabled={isExportingSales || !can('view_reports')}
              onClick={async () => {
                setIsExportingSales(true);
                try {
                  const today = new Date();
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                  const since = monday.toISOString().split('T')[0];
                  const data = await salesService.getAll({ created_after: since, page_size: '500' });
                  await exportWeeklySales(data.results);
                  toast.success('Export ventes semaine téléchargé');
                } catch {
                  toast.error("Erreur lors de l'export");
                } finally {
                  setIsExportingSales(false);
                }
              }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-primary bg-primary/10">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-heading truncate">Ventes de la semaine</p>
                <p className="text-xs text-muted-foreground">Toutes les transactions</p>
              </div>
              {isExportingSales ? (
                <Loader2 className="w-4 h-4 text-muted-foreground ml-auto shrink-0 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              )}
            </button>

            {/* Rapport produits */}
            <button
              disabled={isExportingProducts || !can('view_reports')}
              onClick={async () => {
                setIsExportingProducts(true);
                try {
                  const [productsData, stockData] = await Promise.all([
                    productService.getAll({ page_size: '1000' }),
                    stockService.getAll({ page_size: '1000' }),
                  ]);
                  await exportProductsStockReport(productsData.results, stockData.results);
                  toast.success('Rapport produits téléchargé');
                } catch {
                  toast.error("Erreur lors de l'export");
                } finally {
                  setIsExportingProducts(false);
                }
              }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-success bg-success/10">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-heading truncate">Rapport produits</p>
                <p className="text-xs text-muted-foreground">Stock et performances</p>
              </div>
              {isExportingProducts ? (
                <Loader2 className="w-4 h-4 text-muted-foreground ml-auto shrink-0 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              )}
            </button>

            {/* Rapport clients */}
            <button
              disabled={isExportingClients || !can('view_reports')}
              onClick={async () => {
                setIsExportingClients(true);
                try {
                  const data = await clientService.getAll({ page_size: '1000' });
                  await exportClients(data.results);
                  toast.success('Rapport clients téléchargé');
                } catch {
                  toast.error("Erreur lors de l'export");
                } finally {
                  setIsExportingClients(false);
                }
              }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-warning bg-warning/10">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold font-heading truncate">Rapport clients</p>
                <p className="text-xs text-muted-foreground">Historique d'achats</p>
              </div>
              {isExportingClients ? (
                <Loader2 className="w-4 h-4 text-muted-foreground ml-auto shrink-0 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
              )}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
