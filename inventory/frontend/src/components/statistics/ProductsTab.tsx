import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Package, TrendingDown, PieChart as PieChartIcon, BarChart2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statisticsService } from "@/services/statisticsService";
import type { StatPeriod } from "@/services/statisticsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

// ─── Palette couleurs pour le PieChart ────────────────────────────────────────

const PIE_COLORS = [
  "hsl(22, 72%, 48%)",   // primary (terracotta)
  "hsl(152, 38%, 38%)",  // accent (vert gabon)
  "hsl(36, 88%, 52%)",   // warning (doré)
  "hsl(4, 72%, 52%)",    // destructive (rouge)
  "hsl(200, 60%, 46%)",  // bleu
  "hsl(270, 50%, 52%)",  // violet
  "hsl(152, 52%, 50%)",  // success clair
  "hsl(22, 55%, 62%)",   // primary clair
];

// ─── Squelette de chargement ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/3" />
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/4" />
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/5 ml-auto" />
    </div>
  );
}

// ─── Tooltip custom ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1 truncate max-w-[160px]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          {formatFcfa(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductsTabProps {
  period: StatPeriod;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProductsTab({ period }: ProductsTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["statistics-products", period],
    queryFn: () => statisticsService.getProducts({ period }),
    staleTime: 60_000,
  });

  if (isError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive text-sm">
        <TrendingDown className="w-4 h-4 shrink-0" />
        Impossible de charger les données produits.
      </div>
    );
  }

  // ── Section 1 : Top 10 Vendeurs ────────────────────────────────────────────
  const topSellers = data?.top_sellers.slice(0, 10) ?? [];

  // ── Section 2 : Répartition par catégorie ─────────────────────────────────
  const byCategory = (data?.by_category ?? []).map((c) => ({
    ...c,
    name: c.category,
    value: c.revenue,
  }));
  const totalRevenue = byCategory.reduce((s, c) => s + c.revenue, 0);

  // ── Section 3 : Produits à faible rotation ────────────────────────────────
  const slowMovers = data?.slow_movers ?? [];

  return (
    <div className="space-y-6">

      {/* ── Section 1 : Top 10 par revenu ──────────────────────────────────── */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-heading">Top 10 Produits</h2>
            <p className="text-xs text-muted-foreground">Classés par chiffre d'affaires</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : topSellers.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart2 className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={topSellers}
              margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatFcfa(v)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="product_name"
                width={150}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section 2 : Répartition par catégorie ─────────────────────────── */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <PieChartIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-heading">Répartition par catégorie</h2>
            <p className="text-xs text-muted-foreground">Part du chiffre d'affaires total</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : byCategory.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <PieChartIcon className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Graphique */}
            <div className="w-full lg:w-1/2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {byCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 11, color: "hsl(var(--foreground))" }}>{value}</span>
                    )}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatFcfa(value), "Revenus"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tableau récapitulatif */}
            <div className="w-full lg:w-1/2 space-y-2">
              {byCategory.map((cat, i) => (
                <div
                  key={cat.category}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 text-sm font-medium truncate">{cat.category}</span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : cat.pct_of_total.toFixed(1)}%
                  </span>
                  <span className="text-sm font-semibold font-editorial amount-editorial shrink-0">
                    {formatFcfa(cat.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3 : Produits à faible rotation ────────────────────────── */}
      <div className="card-premium overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-heading">Produits à faible rotation</h2>
            <p className="text-xs text-muted-foreground">Peu ou pas vendus sur la période</p>
          </div>
          {!isLoading && slowMovers.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{slowMovers.length} produits</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : slowMovers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Package className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucun produit à faible rotation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Produit</th>
                  <th className="text-left">Catégorie</th>
                  <th className="text-right">Ventes (période)</th>
                  <th className="text-right">Jours sans vente</th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {slowMovers.map((item) => {
                  const soldBadge =
                    item.total_sold === 0
                      ? "danger"
                      : item.total_sold < 5
                      ? "warning"
                      : "default";
                  const soldLabel =
                    item.total_sold === 0
                      ? "Aucune vente"
                      : item.total_sold < 5
                      ? `${item.total_sold} vente${item.total_sold > 1 ? "s" : ""}`
                      : `${item.total_sold} ventes`;

                  return (
                    <tr key={item.product_id}>
                      <td className="font-medium text-sm">{item.product_name}</td>
                      <td className="text-sm text-muted-foreground">{item.category}</td>
                      <td className="text-right">
                        <StatusBadge label={soldLabel} variant={soldBadge as "danger" | "warning" | "default"} />
                      </td>
                      <td className="text-right text-sm font-mono tabular-nums text-muted-foreground">
                        {item.days_without_sale}j
                      </td>
                      <td className="text-center">
                        <StatusBadge
                          label={item.total_sold === 0 ? "Inactif" : "Lent"}
                          variant={item.total_sold === 0 ? "danger" : "warning"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
