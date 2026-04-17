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

// ─── Couleurs stock — cohérentes avec StockPage ────────────────────────────────
const COLOR_NORMAL   = "hsl(152, 52%, 38%)";   // vert — OK
const COLOR_LOW      = "hsl(36, 88%, 52%)";    // amber — bas
const COLOR_CRITICAL = "hsl(4, 72%, 52%)";     // rouge — rupture / critique

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
  gradientEnd: string;
  barVisible: boolean;
  delay: number;
}

function ProgressBar({ label, count, total, color, gradientEnd, barVisible, delay }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
        <span style={{ color: "hsl(var(--muted-foreground))" }}>{label}</span>
        <span style={{ fontWeight: "600", fontVariantNumeric: "tabular-nums", color }}>
          {count} produit{count > 1 ? "s" : ""} — {pct}%
        </span>
      </div>
      <div
        style={{
          height: "8px",
          borderRadius: "100px",
          background: "hsl(var(--muted))",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "100px",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${gradientEnd})`,
            transform: barVisible ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
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
    <div
      style={{
        background: "hsl(20 25% 10%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "12px",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }} className="truncate max-w-[160px]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: "white", fontWeight: "700", fontFamily: "Fraunces, Georgia, serif", fontSize: "13px" }}>
          {formatFcfa(p.value)}
        </p>
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

  const totalValue = data?.total_value ?? 0;
  const totalProducts = data?.total_products ?? 0;
  const statusBreakdown = data?.status_breakdown;
  const normalCount = statusBreakdown?.normal.count ?? 0;
  const lowCount = statusBreakdown?.low.count ?? 0;
  const criticalCount = statusBreakdown?.critical.count ?? 0;

  const alerts = (data?.alerts ?? []).slice().sort((a, b) => {
    const order = { critique: 0, critical: 0, low: 1, bas: 1, normal: 2 };
    const aOrder = order[a.status as keyof typeof order] ?? 3;
    const bOrder = order[b.status as keyof typeof order] ?? 3;
    return aOrder - bOrder;
  });

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
              transition: "opacity 0.4s ease, transform 0.4s ease",
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
              <div
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderTop: `3px solid ${COLOR_LOW}`,
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Répartition des niveaux
                  </span>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: `${COLOR_LOW}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AlertTriangle style={{ width: "16px", height: "16px", color: COLOR_LOW }} />
                  </div>
                </div>
                {isLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-2 bg-muted rounded skeleton-shimmer" />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <ProgressBar
                      label="Normal"
                      count={normalCount}
                      total={totalProducts}
                      color={COLOR_NORMAL}
                      gradientEnd="hsl(152, 45%, 48%)"
                      barVisible={barVisible}
                      delay={0}
                    />
                    <ProgressBar
                      label="Bas"
                      count={lowCount}
                      total={totalProducts}
                      color={COLOR_LOW}
                      gradientEnd="hsl(36, 88%, 62%)"
                      barVisible={barVisible}
                      delay={80}
                    />
                    <ProgressBar
                      label="Critique"
                      count={criticalCount}
                      total={totalProducts}
                      color={COLOR_CRITICAL}
                      gradientEnd="hsl(4, 72%, 62%)"
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
          borderTop: `3px solid ${COLOR_CRITICAL}`,
          opacity: alertsVisible ? 1 : 0,
          transform: alertsVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "16px 24px", borderBottom: "1px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: `${COLOR_CRITICAL}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle style={{ width: "16px", height: "16px", color: COLOR_CRITICAL }} />
            </div>
            <div>
              <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Alertes stock</h2>
              <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Produits critiques et bas de stock</p>
            </div>
          </div>
          {!isLoading && alerts.length > 0 && (
            <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "hsl(var(--muted) / 0.5)", borderBottom: "1px solid hsl(var(--border))" }}>
                  {["Produit", "Qté actuelle", "Seuil min", "Statut"].map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: i === 0 ? "left" : i === 3 ? "center" : "right",
                        fontSize: "11px",
                        fontWeight: "700",
                        fontFamily: "var(--font-heading)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, idx) => {
                  const isCritical = alert.status === "critical" || alert.status === "critique";
                  return (
                    <tr
                      key={alert.product_id}
                      style={{
                        borderBottom: "1px solid hsl(var(--border))",
                        opacity: rowsVisible ? 1 : 0,
                        transform: rowsVisible ? "translateY(0)" : "translateY(5px)",
                        transition: "opacity 0.35s ease, transform 0.35s ease, background 0.15s ease",
                        transitionDelay: `${idx * 45}ms`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = isCritical
                          ? `${COLOR_CRITICAL}06`
                          : `${COLOR_LOW}06`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "hsl(var(--foreground))" }}>
                        {alert.product_name}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                        {alert.quantity}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                        {alert.min_threshold}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
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
          borderTop: `3px solid ${COLOR_NORMAL}`,
          opacity: chartVisible ? 1 : 0,
          transform: chartVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: `${COLOR_NORMAL}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart2 style={{ width: "16px", height: "16px", color: COLOR_NORMAL }} />
          </div>
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Top 10 par valeur stockée</h2>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Produits représentant le plus de capital immobilisé</p>
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
              <defs>
                <linearGradient id="gradStockBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLOR_NORMAL} />
                  <stop offset="100%" stopColor="hsl(152, 45%, 50%)" />
                </linearGradient>
              </defs>
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
              <Bar dataKey="value" fill="url(#gradStockBar)" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
