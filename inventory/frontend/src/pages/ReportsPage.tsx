import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { dashboardService } from "@/services/dashboardService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return `${amount} FCFA`;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getStats,
  });

  const salesByDay = stats?.sales_by_day ?? [];
  const topProducts = stats?.top_products ?? [];
  const maxSale = salesByDay.length > 0 ? Math.max(...salesByDay.map((d) => d.total)) : 1;

  // Weekly totals derived from stats
  const weekRevenue = salesByDay.reduce((sum, d) => sum + d.total, 0);
  const weekTransactions = salesByDay.reduce((sum, d) => sum + d.count, 0);
  const avgBasket = weekTransactions > 0 ? Math.round(weekRevenue / weekTransactions) : 0;
  const totalClients = stats?.clients.total ?? 0;

  return (
    <>
      <Topbar title="Rapports" subtitle="Statistiques de ventes et performances" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* KPIs */}
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

        {isError && (
          <p className="text-sm text-destructive mb-4">
            Impossible de charger les données. Vérifiez votre connexion.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Bar chart — ventes par jour */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold mb-6">Ventes par jour (semaine)</h2>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Chargement…
              </div>
            ) : salesByDay.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            ) : (
              <div className="flex items-end gap-2 sm:gap-3 h-48">
                {salesByDay.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : String(d.total)}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${(d.total / maxSale) * 100}%`,
                        background: "hsl(var(--primary))",
                        opacity: 0.8,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top produits */}
          <div className="bg-card rounded-lg border">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Produits les plus vendus</h2>
            </div>
            <div className="p-4 space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnée disponible
                </p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.product__name} className="flex items-center gap-3 sm:gap-4">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.product__name}</p>
                      <p className="text-xs text-muted-foreground">{p.total_sold} vendus</p>
                    </div>
                    <span className="text-xs sm:text-sm font-medium shrink-0 text-right">
                      {formatFcfa(p.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
