import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardStats } from "@/services/dashboardService";
import type { Sale } from "@/services/salesService";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className={cn("flex items-end gap-0.5 h-6", className)}>
      {data.map((val, i) => {
        const heightPct = ((val - min) / range) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm transition-all",
              isLast ? "bg-primary" : "bg-primary/25"
            )}
            style={{ height: `${Math.max(15, heightPct)}%` }}
          />
        );
      })}
    </div>
  );
}

function KpiValue({ end, suffix, duration }: { end: number; suffix: string; duration: number }) {
  const counted = useCountUp({ end, duration });
  return <>{counted}{suffix}</>;
}

function KpiCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-8 h-8 rounded-md" />
      </div>
      <Skeleton className="h-7 w-32 mb-1" />
      <Skeleton className="h-3 w-28 mt-1" />
      <Skeleton className="h-6 w-full mt-3 rounded-sm" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded" />
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60_000,
  });

  // Derive sparkline from sales_by_day (last 7 entries, or fewer)
  const daySpark = (stats?.sales_by_day ?? []).slice(-7).map((d) => d.total);
  const daySparkFilled = daySpark.length > 0 ? daySpark : [0];

  // KPI values from API
  const todayRevenue = stats?.today.revenue ?? 0;
  const todayCount = stats?.today.sales_count ?? 0;
  const monthRevenue = stats?.month.revenue ?? 0;
  const monthCount = stats?.month.sales_count ?? 0;
  const avgCartToday = todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0;
  const lowCount = stats?.stock.low_count ?? 0;
  const totalClients = stats?.clients.total ?? 0;

  // recent_sales typed as Sale[]
  const recentSales = (stats?.recent_sales ?? []) as Sale[];

  // top products
  const topProducts = stats?.top_products ?? [];

  return (
    <>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Header row: CTA caisse ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-6">
          <button
            onClick={() => navigate("/pos")}
            className="group flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Ouvrir la caisse
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              {/* Ventes du jour */}
              <div
                className="stat-card"
                style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "0ms" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">Ventes aujourd'hui</span>
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="stat-value">
                  <KpiValue key={`today-rev-${todayRevenue}`} end={todayRevenue} suffix=" FCFA" duration={1200} />
                </div>
                <p className="text-xs mt-1 font-medium text-muted-foreground">
                  {todayCount} transaction{todayCount !== 1 ? "s" : ""}
                </p>
                <Sparkline data={daySparkFilled} className="mt-3" />
              </div>

              {/* CA mensuel */}
              <div
                className="stat-card"
                style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "80ms" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">CA ce mois</span>
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="stat-value">
                  <KpiValue key={`month-rev-${monthRevenue}`} end={monthRevenue} suffix=" FCFA" duration={1200} />
                </div>
                <p className="text-xs mt-1 font-medium text-muted-foreground">
                  {monthCount} transaction{monthCount !== 1 ? "s" : ""}
                </p>
                <Sparkline data={daySparkFilled} className="mt-3" />
              </div>

              {/* Panier moyen du jour */}
              <div
                className="stat-card"
                style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "160ms" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">Panier moyen</span>
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="stat-value">
                  <KpiValue key={`avg-${avgCartToday}`} end={avgCartToday} suffix=" FCFA" duration={1000} />
                </div>
                <p className="text-xs mt-1 font-medium text-muted-foreground">
                  Basé sur aujourd'hui
                </p>
                <Sparkline data={daySparkFilled} className="mt-3" />
              </div>

              {/* Alertes stock + Clients */}
              <div
                className="stat-card"
                style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "240ms" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">Clients</span>
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="stat-value">
                  <KpiValue key={`clients-${totalClients}`} end={totalClients} suffix="" duration={800} />
                </div>
                <p className="text-xs mt-1 font-medium text-muted-foreground">
                  {lowCount > 0 ? (
                    <span className="text-destructive font-semibold">
                      {lowCount} produit{lowCount !== 1 ? "s" : ""} en stock bas
                    </span>
                  ) : (
                    "Stock OK"
                  )}
                </p>
                <Sparkline data={daySparkFilled} className="mt-3" />
              </div>
            </>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ventes récentes (span 2) */}
          <div className="lg:col-span-2 bg-card rounded-lg border">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Ventes récentes</h2>
            </div>
            {isLoading ? (
              <TableSkeleton rows={5} />
            ) : recentSales.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune vente enregistrée pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Réf.</th>
                      <th>Date</th>
                      <th>Articles</th>
                      <th>Total</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="font-medium">
                          {sale.invoice_number ?? `VNT-${sale.id}`}
                        </td>
                        <td>{formatDate(sale.created_at)}</td>
                        <td>{sale.items.length}</td>
                        <td className="font-medium">{formatFcfa(sale.total_amount)}</td>
                        <td><StatusBadge label="Terminée" variant="success" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-6">

            {/* Widget Alertes stock */}
            <div className="bg-card rounded-lg border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h2 className="text-sm font-semibold">Alertes stock</h2>
                  {!isLoading && lowCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
                      {lowCount}
                    </span>
                  )}
                </div>
              </div>
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : lowCount === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Tous les produits ont un stock suffisant.
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="font-semibold text-destructive">{lowCount}</span> produit{lowCount !== 1 ? "s" : ""} sous le seuil minimum.
                  </p>
                  <button
                    onClick={() => navigate("/stock")}
                    className="w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    Voir le stock →
                  </button>
                </div>
              )}
              {!isLoading && lowCount > 0 && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => navigate("/stock")}
                    className="w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                  >
                    Voir tout le stock →
                  </button>
                </div>
              )}
            </div>

            {/* Widget Top produits */}
            <div className="bg-card rounded-lg border flex flex-col">
              <div className="px-5 py-4 border-b flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warning" />
                <h2 className="text-sm font-semibold">Top produits</h2>
              </div>
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded" />
                  ))}
                </div>
              ) : topProducts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Aucune donnée disponible.
                </div>
              ) : (
                <div className="p-4 space-y-2 overflow-y-auto max-h-[260px]">
                  {topProducts.slice(0, 6).map((p, i) => (
                    <div key={p.product__name} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/60 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ShoppingBag className="w-3 h-3 text-primary shrink-0" />
                          <p className="text-xs font-medium truncate">{p.product__name}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-semibold">{p.total_sold} vendus</p>
                        <p className="text-[10px] text-muted-foreground">{formatFcfa(p.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 pb-4 mt-auto border-t pt-3">
                <button
                  onClick={() => navigate("/reports")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Voir les rapports →
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
