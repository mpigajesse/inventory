import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Package, AlertTriangle, BarChart2, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { statisticsService } from "@/services/statisticsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

// ─── Squelette de chargement ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/3" />
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/6" />
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/6" />
      <div className="h-4 bg-muted rounded skeleton-shimmer w-1/6 ml-auto" />
    </div>
  );
}

// ─── Barre de progression colorée ────────────────────────────────────────────

interface ProgressBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
  barVisible: boolean;
  delay: number;
}

function ProgressBar({ label, count, total, color, barVisible, delay }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums" style={{ color }}>
          {count} produit{count > 1 ? "s" : ""} — {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transform: barVisible ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
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
        <p key={i} className="text-muted-foreground">{formatFcfa(p.value)}</p>
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function StockTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["statistics-stock"],
    queryFn: () => statisticsService.getStock(),
    staleTime: 60_000,
  });

  // Entrance animation state
  const [kpiVisible, setKpiVisible] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [rowsVisible, setRowsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setKpiVisible(true), 30);
    const t2 = setTimeout(() => setAlertsVisible(true), 100);
    const t3 = setTimeout(() => setChartVisible(true), 300);
    const t4 = setTimeout(() => setBarVisible(true), 200);
    const t5 = setTimeout(() => setRowsVisible(true), 80);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  if (isError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive text-sm">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Impossible de charger les données de stock.
      </div>
    );
  }

  // ── Section 1 : KPIs ──────────────────────────────────────────────────────
  const totalValue = data?.total_value ?? 0;
  const totalProducts = data?.total_products ?? 0;
  const statusBreakdown = data?.status_breakdown;
  const normalCount = statusBreakdown?.normal.count ?? 0;
  const lowCount = statusBreakdown?.low.count ?? 0;
  const criticalCount = statusBreakdown?.critical.count ?? 0;

  // ── Section 2 : Alertes ───────────────────────────────────────────────────
  const alerts = (data?.alerts ?? []).slice().sort((a, b) => {
    const order = { critique: 0, critical: 0, low: 1, bas: 1, normal: 2 };
    const aOrder = order[a.status as keyof typeof order] ?? 3;
    const bOrder = order[b.status as keyof typeof order] ?? 3;
    return aOrder - bOrder;
  });

  // ── Section 3 : Top valeur stockée ───────────────────────────────────────
  const topValueProducts = (data?.top_value_products ?? []).slice(0, 10);

  const kpiCards = [0, 1, 2];

  return (
    <div className="space-y-6">

      {/* ── Section 1 : KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((idx) => (
          <div
            key={idx}
            style={{
              opacity: kpiVisible ? 1 : 0,
              transform: kpiVisible ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 0.4s ease, transform 0.4s ease`,
              transitionDelay: `${idx * 65}ms`,
            }}
          >
            {idx === 0 && (
              <StatCard
                label="Valeur totale du stock"
                value={isLoading ? "—" : formatFcfa(totalValue)}
                icon={Wallet}
                animated={!isLoading && totalValue > 0}
                numericValue={isLoading ? undefined : totalValue}
              />
            )}
            {idx === 1 && (
              <StatCard
                label="Total produits en stock"
                value={isLoading ? "—" : String(totalProducts)}
                icon={Package}
              />
            )}
            {idx === 2 && (
              <div className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">Répartition des niveaux</span>
                  <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  </div>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-2 bg-muted rounded skeleton-shimmer" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <ProgressBar
                      label="Normal"
                      count={normalCount}
                      total={totalProducts}
                      color="hsl(var(--success))"
                      barVisible={barVisible}
                      delay={0}
                    />
                    <ProgressBar
                      label="Bas"
                      count={lowCount}
                      total={totalProducts}
                      color="hsl(var(--warning))"
                      barVisible={barVisible}
                      delay={80}
                    />
                    <ProgressBar
                      label="Critique"
                      count={criticalCount}
                      total={totalProducts}
                      color="hsl(var(--destructive))"
                      barVisible={barVisible}
                      delay={160}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Section 2 : Tableau des alertes ──────────────────────────────── */}
      <div
        className="card-premium overflow-hidden"
        style={{
          opacity: alertsVisible ? 1 : 0,
          transform: alertsVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-heading">Alertes stock</h2>
              <p className="text-xs text-muted-foreground">Produits critiques et bas de stock</p>
            </div>
          </div>
          {!isLoading && alerts.length > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {criticalCount} critique{criticalCount > 1 ? "s" : ""} · {lowCount} bas
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Package className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune alerte — stock en bonne santé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Produit</th>
                  <th className="text-right">Qté actuelle</th>
                  <th className="text-right">Seuil min</th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, idx) => {
                  const isCritical = alert.status === "critical" || alert.status === "critique";
                  return (
                    <tr
                      key={alert.product_id}
                      style={{
                        opacity: rowsVisible ? 1 : 0,
                        transform: rowsVisible ? "translateY(0)" : "translateY(5px)",
                        transition: `opacity 0.35s ease, transform 0.35s ease`,
                        transitionDelay: `${idx * 45}ms`,
                      }}
                    >
                      <td className="font-medium text-sm">{alert.product_name}</td>
                      <td className="text-right font-mono tabular-nums text-sm">{alert.quantity}</td>
                      <td className="text-right font-mono tabular-nums text-sm text-muted-foreground">
                        {alert.min_threshold}
                      </td>
                      <td className="text-center">
                        <StatusBadge
                          label={isCritical ? "Critique" : "Bas"}
                          variant={isCritical ? "danger" : "warning"}
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

      {/* ── Section 3 : Top produits par valeur stockée ───────────────────── */}
      <div
        className="card-premium p-6"
        style={{
          opacity: chartVisible ? 1 : 0,
          transform: chartVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-heading">Top 10 par valeur stockée</h2>
            <p className="text-xs text-muted-foreground">Produits représentant le plus de capital immobilisé</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : topValueProducts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart2 className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              layout="vertical"
              data={topValueProducts}
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
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
