import React from "react";
import { Link, useOutletContext } from "react-router-dom";
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
  FileSpreadsheet,
  Clock,
  UserCheck,
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

function formatFcfa(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!isFinite(n) || isNaN(n)) return "— FCFA";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M FCFA`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k FCFA`;
  return `${n} FCFA`;
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

// ─── Report card types ────────────────────────────────────────────────────────

interface ReportCard {
  id: string;
  title: string;
  description: string;
  period: string;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  isLoading: boolean;
  disabled: boolean;
  onDownload: () => void;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { can } = usePermissions();
  const [isExportingClients, setIsExportingClients] = React.useState(false);
  const [isExportingProducts, setIsExportingProducts] = React.useState(false);
  const [isExportingSales, setIsExportingSales] = React.useState(false);
  const [isExportingFull, setIsExportingFull] = React.useState(false);

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

  const { data: vendeurStats, isLoading: isLoadingVendeurStats } = useQuery({
    queryKey: ["sales-daily-stats", "month"],
    queryFn: () => salesService.getDailyStats("month"),
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
  const maxSale = salesByDay.length > 0 ? (Math.max(...salesByDay.map((d) => d.total)) || 1) : 1;

  const weekRevenue = salesByDay.reduce((sum, d) => sum + d.total, 0);
  const weekTransactions = salesByDay.reduce((sum, d) => sum + d.count, 0);
  const avgBasket = weekTransactions > 0 ? Math.round(weekRevenue / weekTransactions) : 0;
  const totalClients = stats?.clients.total ?? 0;

  // ── Download handlers ──────────────────────────────────────────────────────

  async function handleDownloadSales() {
    setIsExportingSales(true);
    try {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const since = monday.toISOString().split('T')[0];
      const data = await salesService.getAll({ created_after: since, page_size: '500' });
      await exportWeeklySales(data.results);
      toast.success('Export ventes semaine téléchargé');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'export";
      toast.error(msg);
    } finally {
      setIsExportingSales(false);
    }
  }

  async function handleDownloadProducts() {
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
  }

  async function handleDownloadClients() {
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
  }

  async function handleDownloadFull() {
    if (!stats) return;
    setIsExportingFull(true);
    try {
      exportReportToExcel({ stats, stockAlerts });
      toast.success('Rapport complet téléchargé');
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExportingFull(false);
    }
  }

  const REPORTS: ReportCard[] = [
    {
      id: "sales",
      title: "Ventes de la semaine",
      description: "Toutes les transactions de la semaine en cours avec détails par produit.",
      period: "Cette semaine",
      color: "hsl(22 72% 48%)",
      icon: ShoppingCart,
      isLoading: isExportingSales,
      disabled: isExportingSales || !can('view_reports'),
      onDownload: handleDownloadSales,
    },
    {
      id: "products",
      title: "Rapport produits",
      description: "Inventaire complet avec niveaux de stock, valeur et performances de vente.",
      period: "État actuel",
      color: "hsl(152 38% 38%)",
      icon: BarChart2,
      isLoading: isExportingProducts,
      disabled: isExportingProducts || !can('view_reports'),
      onDownload: handleDownloadProducts,
    },
    {
      id: "clients",
      title: "Rapport clients",
      description: "Liste des clients avec historique d'achats et statistiques de fidélité.",
      period: "Tous les temps",
      color: "hsl(36 88% 52%)",
      icon: Users,
      isLoading: isExportingClients,
      disabled: isExportingClients || !can('view_reports'),
      onDownload: handleDownloadClients,
    },
    {
      id: "full",
      title: "Rapport complet",
      description: "Synthèse globale : ventes, stock critique, top produits et KPIs essentiels.",
      period: "Vue synthétique",
      color: "hsl(210 70% 52%)",
      icon: Trophy,
      isLoading: isExportingFull,
      disabled: isExportingFull || !stats || isLoading || !can('view_reports'),
      onDownload: handleDownloadFull,
    },
  ];

  return (
    <>
      <Topbar title="Rapports" subtitle="Statistiques de ventes et performances" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <div
              className="flex-shrink-0"
              style={{
                width: "3px",
                height: "28px",
                borderRadius: "2px",
                background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
              }}
            />
            <h1
              className="text-xl sm:text-2xl font-extrabold font-heading truncate"
              style={{ letterSpacing: "-0.02em" }}
            >
              Rapports & Exports
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-4">
            Ventes hebdomadaires, produits phares et exports Excel
          </p>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Ventes semaine", value: isLoading ? "—" : formatFcfa(weekRevenue), icon: DollarSign },
            { label: "Transactions", value: isLoading ? "—" : String(weekTransactions), icon: ShoppingCart },
            { label: "Panier moyen", value: isLoading ? "—" : formatFcfa(avgBasket), icon: TrendingUp },
            { label: "Clients actifs", value: isLoading ? "—" : String(totalClients), icon: Users },
          ].map((card, index) => (
            <div
              key={card.label}
              style={{
                opacity: 0,
                animation: "slideInLeft 0.3s ease forwards",
                animationDelay: `${index * 70}ms`,
              }}
            >
              <StatCard label={card.label} value={card.value} icon={card.icon} />
            </div>
          ))}
        </div>

        {/* ── Erreur ── */}
        {isError && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive text-sm">
            <TrendingUp className="w-4 h-4 shrink-0" />
            Impossible de charger les données. Vérifiez votre connexion.
          </div>
        )}

        {/* ── Grille graphiques ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5"
          style={{
            opacity: 0,
            animation: "fadeIn 0.5s ease forwards",
            animationDelay: "200ms",
          }}
        >

          {/* Graphique barres — ventes par jour */}
          <div
            className="card-premium p-4 sm:p-6"
            style={{
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap mb-6">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold font-heading">Ventes par jour</h2>
                  <p className="text-xs text-muted-foreground">Cette semaine</p>
                </div>
              </div>
              {!isLoading && weekRevenue > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-1 rounded-full shrink-0">
                  <ArrowUpRight className="w-3 h-3" />
                  {formatFcfa(weekRevenue)}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="h-48 flex items-end gap-2">
                {[55, 80, 45, 90, 65, 75, 50].map((heightPct, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md skeleton-shimmer"
                      style={{ height: `${heightPct}%` }}
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
              <div className="flex items-end gap-1 sm:gap-2 md:gap-3 h-48">
                {salesByDay.map((d, i) => {
                  const heightPct = Math.max(4, (d.total / maxSale) * 100);
                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-1 group min-w-0"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity leading-none">
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
                        <div className="absolute inset-0 rounded-t-lg bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                      </div>
                      <span className="text-[9px] sm:text-[11px] text-muted-foreground font-medium leading-none overflow-hidden text-ellipsis w-full text-center">{formatDayLabel(d.day)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top produits */}
          <div
            className="card-premium overflow-hidden"
            style={{
              borderRadius: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
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
                  const maxRevenue = Math.max(...topProducts.map((t) => t.revenue), 1);
                  const barPct = Math.max(4, (p.revenue / maxRevenue) * 100);
                  return (
                    <div
                      key={p.product__name}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors animate-fade-scale"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
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

                      <span className="text-xs sm:text-sm font-semibold shrink-0 text-right font-editorial amount-editorial">
                        {formatFcfa(p.revenue)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Download Center ── */}
        <div className="mb-2">
          {/* Section header */}
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Download className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
                <h2 className="text-base font-bold font-heading">Centre de téléchargement</h2>
              </div>
              <p className="text-xs text-muted-foreground ml-6">Exportez vos données en fichiers Excel</p>
            </div>

            {/* Lien vers statistiques avancées */}
            <div
              className="flex items-center gap-3 px-4 py-3 w-full sm:w-auto"
              style={{
                borderRadius: "16px",
                background: "linear-gradient(135deg, hsl(22 72% 48% / 0.08), hsl(36 88% 52% / 0.05))",
                border: "1px solid hsl(22 72% 48% / 0.18)",
              }}
            >
              <BarChart2 className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(22 72% 48%)" }} />
              <p className="text-xs text-foreground flex-1 min-w-0">
                Analyses avancées avec graphiques dans les{" "}
                <strong>Statistiques</strong>
              </p>
              <Link
                to="/statistics"
                className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all text-white whitespace-nowrap shrink-0"
                style={{ background: "hsl(22 72% 48%)" }}
              >
                Voir →
              </Link>
            </div>
          </div>

          {/* Cards de rapport */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {REPORTS.map((report, index) => (
              <div
                key={report.id}
                style={{
                  borderRadius: "20px",
                  overflow: "hidden",
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
                  opacity: 0,
                  animation: "slide-in-up 0.35s ease forwards",
                  animationDelay: `${index * 70}ms`,
                  transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 10px 28px hsl(22 30% 15% / 0.1)";
                  e.currentTarget.style.borderColor = `color-mix(in srgb, ${report.color} 30%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px hsl(22 30% 15% / 0.06)";
                  e.currentTarget.style.borderColor = "hsl(var(--border))";
                }}
              >
                {/* Color band top — 4px, highly visible */}
                <div style={{ height: "4px", background: report.color }} />

                <div className="p-5">
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: `color-mix(in srgb, ${report.color} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${report.color} 25%, transparent)`,
                    }}
                  >
                    <report.icon className="w-5 h-5" style={{ color: report.color }} />
                  </div>

                  <h3
                    className="font-heading text-sm text-foreground mb-1"
                    style={{ fontWeight: 800, letterSpacing: "-0.01em" }}
                  >
                    {report.title}
                  </h3>
                  <p
                    className="mb-4 leading-relaxed"
                    style={{
                      fontSize: "13px",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    {report.description}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3" />
                      Excel .xlsx
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.period}
                    </span>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => report.onDownload()}
                    disabled={report.disabled}
                    className="w-full flex items-center justify-center gap-2 py-2.5 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderRadius: "12px",
                      background: report.isLoading
                        ? "hsl(var(--muted))"
                        : `linear-gradient(135deg, ${report.color}, color-mix(in srgb, ${report.color} 75%, hsl(36 88% 52%)))`,
                      color: report.isLoading ? "hsl(var(--muted-foreground))" : "white",
                      border: "none",
                      boxShadow: report.isLoading
                        ? "none"
                        : `0 4px 14px color-mix(in srgb, ${report.color} 35%, transparent)`,
                      cursor: report.disabled ? (report.isLoading ? "wait" : "not-allowed") : "pointer",
                    }}
                  >
                    {report.isLoading ? (
                      <>
                        <Download className="w-4 h-4 animate-spin" />
                        Export en cours...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Télécharger
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ventes par vendeur (ce mois) ── */}
        <div
          className="mt-5 card-premium overflow-hidden"
          style={{
            borderRadius: "20px",
            opacity: 0,
            animation: "fadeIn 0.5s ease forwards",
            animationDelay: "350ms",
          }}
        >
          <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold font-heading">Ventes par vendeur — Ce mois</h2>
              <p className="text-xs text-muted-foreground">Cumul des ventes par caissier sur les 30 derniers jours</p>
            </div>
          </div>

          {isLoadingVendeurStats ? (
            <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : !vendeurStats || vendeurStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <ShoppingCart className="w-7 h-7 opacity-25" />
              <p className="text-sm">Aucune donnée disponible pour ce mois</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendeur·se</th>
                    <th className="text-right px-3 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ventes</th>
                    <th className="text-right px-3 sm:px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">CA (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {vendeurStats
                    .slice()
                    .sort((a, b) => b.total_revenue - a.total_revenue)
                    .map((stat, i) => (
                      <tr
                        key={stat.cashier_id}
                        className="border-t hover:bg-muted/30 transition-colors"
                        style={{
                          opacity: 0,
                          animation: "slideInLeft 0.25s ease forwards",
                          animationDelay: `${i * 40}ms`,
                        }}
                      >
                        <td className="px-3 sm:px-6 py-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: "var(--gradient-primary)" }}
                            >
                              {stat.cashier_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium font-heading truncate">{stat.cashier_name}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-semibold">{stat.sales_count}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-bold amount-editorial">{formatFcfa(stat.total_revenue)}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
