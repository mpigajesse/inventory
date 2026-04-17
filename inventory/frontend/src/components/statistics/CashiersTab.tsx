import React from "react";
import { useQuery } from "@tanstack/react-query";
import { statisticsService } from "@/services/statisticsService";
import type { StatPeriod, CashierStat } from "@/services/statisticsService";
import { Users, Trophy, ShoppingCart, Loader2, TrendingUp } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return amount.toLocaleString("fr-FR") + " FCFA";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CashiersTabProps {
  period: StatPeriod;
}

// ─── Ligne de table ───────────────────────────────────────────────────────────

interface CashierRowProps {
  stat: CashierStat;
  isTop: boolean;
  revenuePct: number;
  rank: number;
}

function CashierRow({ stat, isTop, revenuePct, rank }: CashierRowProps) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Rang */}
      <td className="px-4 py-3 text-sm font-medium text-muted-foreground w-12">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
            rank === 1
              ? "bg-warning/15 text-warning"
              : rank === 2
              ? "bg-muted text-muted-foreground"
              : rank === 3
              ? "bg-primary/10 text-primary"
              : "bg-muted/50 text-muted-foreground/60"
          }`}
        >
          {rank}
        </span>
      </td>

      {/* Nom + badge Top */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: isTop
                ? "linear-gradient(135deg, hsl(36, 88%, 48%), hsl(22, 72%, 52%))"
                : "linear-gradient(135deg, hsl(22, 72%, 48%), hsl(36, 88%, 52%))",
              boxShadow: isTop ? "0 2px 8px hsl(36 88% 48% / 0.3)" : "0 2px 8px hsl(22 72% 48% / 0.25)",
            }}
          >
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold font-heading truncate">
              {stat.cashier_name}
            </p>
            {isTop && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 border border-warning/20 rounded-full px-2 py-0.5">
                <Trophy className="w-2.5 h-2.5" />
                Top caissier
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Ventes */}
      <td className="px-4 py-3 text-sm text-right">
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
          {stat.total_sales}
        </span>
      </td>

      {/* Revenus + barre */}
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex flex-col gap-1.5">
          <span
            className="text-sm font-semibold text-right"
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              color: "hsl(22 72% 48%)",
              letterSpacing: "-0.01em",
            }}
          >
            {formatFcfa(stat.total_revenue)}
          </span>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${revenuePct}%`,
                background: isTop
                  ? "linear-gradient(90deg, hsl(36, 88%, 52%), hsl(22, 72%, 48%))"
                  : "linear-gradient(90deg, hsl(22, 72%, 48%), hsl(36, 88%, 52%))",
              }}
            />
          </div>
        </div>
      </td>

      {/* Panier moyen */}
      <td className="px-4 py-3 text-sm text-right font-medium text-muted-foreground">
        {formatFcfa(stat.avg_basket)}
      </td>

      {/* Articles / vente */}
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">
        {stat.avg_items_per_sale.toFixed(1)}
      </td>
    </tr>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CashiersTab({ period }: CashiersTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["statistics", "cashiers", period],
    queryFn: () => statisticsService.getCashiers({ period }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement des performances caissiers…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <TrendingUp className="w-8 h-8 opacity-25" />
        <p className="text-sm">Impossible de charger les données caissiers.</p>
      </div>
    );
  }

  const cashiers = data.data ?? [];
  const maxRevenue = cashiers.length > 0
    ? Math.max(...cashiers.map((c) => c.total_revenue))
    : 1;
  const topId = cashiers.length > 0
    ? cashiers.reduce((best, c) => (c.total_revenue > best.total_revenue ? c : best), cashiers[0]).cashier_id
    : -1;

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold font-heading">Performances caissiers</h2>
          <p className="text-xs text-muted-foreground">
            {cashiers.length} caissier{cashiers.length !== 1 ? "s" : ""} sur la période
          </p>
        </div>
      </div>

      {cashiers.length === 0 ? (
        <div className="card-premium p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Users className="w-10 h-10 opacity-20" />
          <p className="text-sm">Aucune donnée caissier pour cette période.</p>
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          {/* Table desktop */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className="text-xs text-muted-foreground font-semibold uppercase tracking-wide"
                  style={{ background: "hsl(var(--muted) / 0.5)", borderBottom: "1px solid hsl(var(--border))" }}
                >
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Caissier</th>
                  <th className="px-4 py-3 text-right">Ventes</th>
                  <th className="px-4 py-3 text-left min-w-[180px]">Revenus</th>
                  <th className="px-4 py-3 text-right">Panier moyen</th>
                  <th className="px-4 py-3 text-right">Articles / vente</th>
                </tr>
              </thead>
              <tbody>
                {cashiers.map((stat, idx) => {
                  const revenuePct = maxRevenue > 0
                    ? Math.max(4, (stat.total_revenue / maxRevenue) * 100)
                    : 4;
                  return (
                    <CashierRow
                      key={stat.cashier_id}
                      stat={stat}
                      isTop={stat.cashier_id === topId}
                      revenuePct={revenuePct}
                      rank={idx + 1}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
