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

// ─── Palette couleurs pour le PieChart — 6 couleurs distinctes cycliques ──────

const PIE_COLORS = [
  "hsl(22, 72%, 48%)",   // cuivre primaire
  "hsl(152, 38%, 38%)",  // vert forêt
  "hsl(210, 70%, 52%)",  // bleu
  "hsl(36, 88%, 52%)",   // amber / doré
  "hsl(280, 60%, 55%)",  // violet
  "hsl(4, 72%, 52%)",    // rouge
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

  const [visible, setVisible] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [pieVisible, setPieVisible] = useState(false);
  const [slowVisible, setSlowVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => setChartVisible(true), 150);
    const t3 = setTimeout(() => setPieVisible(true), 300);
    const t4 = setTimeout(() => setSlowVisible(true), 80);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  if (isError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/25 bg-destructive/5 text-destructive text-sm">
        <TrendingDown className="w-4 h-4 shrink-0" />
        Impossible de charger les données produits.
      </div>
    );
  }

  const topSellers = data?.top_sellers.slice(0, 10) ?? [];
  const byCategory = (data?.by_category ?? []).map((c) => ({
    ...c,
    name: c.category,
    value: c.revenue,
  }));
  const totalRevenue = byCategory.reduce((s, c) => s + c.revenue, 0);
  const slowMovers = data?.slow_movers ?? [];

  return (
    <div className="space-y-6">

      {/* ── Section 1 : Top 10 par revenu ──────────────────────────────────── */}
      <div
        className="card-premium p-6"
        style={{
          borderTop: "3px solid hsl(22 72% 48%)",
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
              background: "hsl(22 72% 48% / 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart2 style={{ width: "16px", height: "16px", color: "hsl(22 72% 48%)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Top 10 Produits</h2>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Classés par chiffre d'affaires</p>
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
              <defs>
                <linearGradient id="gradTopSellers" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(22, 72%, 48%)" />
                  <stop offset="100%" stopColor="hsl(30, 82%, 58%)" />
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
              <Bar dataKey="revenue" fill="url(#gradTopSellers)" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section 2 : Répartition par catégorie ─────────────────────────── */}
      <div
        className="card-premium p-6"
        style={{
          borderTop: "3px solid hsl(280 60% 55%)",
          opacity: pieVisible ? 1 : 0,
          transform: pieVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "hsl(280 60% 55% / 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PieChartIcon style={{ width: "16px", height: "16px", color: "hsl(280 60% 55%)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Répartition par catégorie</h2>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Part du chiffre d'affaires total</p>
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
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="transparent"
                      />
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
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "4px" }}>
              {byCategory.map((cat, i) => (
                <div
                  key={cat.category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    cursor: "default",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(5px)",
                    transition: "opacity 0.35s ease, transform 0.35s ease, background 0.15s ease",
                    transitionDelay: `${i * 45}ms`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--muted) / 0.45)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  <span style={{ flex: 1, fontSize: "13px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cat.category}
                  </span>
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace", flexShrink: 0 }}>
                    {totalRevenue > 0
                      ? ((cat.revenue / totalRevenue) * 100).toFixed(1)
                      : (cat.pct_of_total ?? 0).toFixed(1)}%
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      fontFamily: "Fraunces, Georgia, serif",
                      flexShrink: 0,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {formatFcfa(cat.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3 : Produits à faible rotation ────────────────────────── */}
      <div
        className="card-premium overflow-hidden"
        style={{
          borderTop: "3px solid hsl(36 88% 52%)",
          opacity: slowVisible ? 1 : 0,
          transform: slowVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease 0.08s, transform 0.4s ease 0.08s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px 24px", borderBottom: "1px solid hsl(var(--border))" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background: "hsl(36 88% 52% / 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingDown style={{ width: "16px", height: "16px", color: "hsl(36 88% 52%)" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Produits à faible rotation</h2>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Peu ou pas vendus sur la période</p>
          </div>
          {!isLoading && slowMovers.length > 0 && (
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
              {slowMovers.length} produits
            </span>
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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "hsl(var(--muted) / 0.5)", borderBottom: "1px solid hsl(var(--border))" }}>
                  {["Produit", "Catégorie", "Ventes (période)", "Jours sans vente", "Statut"].map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: i < 2 ? "left" : i === 4 ? "center" : "right",
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
                {slowMovers.map((item, idx) => {
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
                    <tr
                      key={item.product_id}
                      style={{
                        borderBottom: "1px solid hsl(var(--border))",
                        opacity: visible ? 1 : 0,
                        transform: visible ? "translateY(0)" : "translateY(5px)",
                        transition: "opacity 0.35s ease, transform 0.35s ease, background 0.15s ease",
                        transitionDelay: `${idx * 45}ms`,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "hsl(22 72% 48% / 0.04)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: "500", color: "hsl(var(--foreground))" }}>
                        {item.product_name}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                        {item.category}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <StatusBadge label={soldLabel} variant={soldBadge as "danger" | "warning" | "default"} />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "13px", fontFamily: "monospace", fontVariantNumeric: "tabular-nums", color: "hsl(var(--muted-foreground))" }}>
                        {item.days_without_sale}j
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
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
