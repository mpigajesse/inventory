import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { statisticsService } from "@/services/statisticsService";
import type { StatPeriod, PaymentMethodStat } from "@/services/statisticsService";
import { CreditCard, Banknote, Smartphone, Loader2, TrendingUp, ShoppingCart } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M FCFA`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`;
  return amount.toLocaleString("fr-FR") + " FCFA";
}

// ─── Palette méthodes de paiement ─────────────────────────────────────────────
// Espèces = vert forêt, Mobile = bleu, Carte = violet, Crédit = amber

const METHOD_COLORS: Record<string, string> = {
  cash:         "hsl(152, 38%, 38%)",  // vert forêt
  mobile_money: "hsl(210, 70%, 52%)",  // bleu
  card:         "hsl(280, 60%, 55%)",  // violet
  credit:       "hsl(36, 88%, 52%)",   // amber
};

// Couleur de fond teinté (card background)
const METHOD_BG_COLORS: Record<string, string> = {
  cash:         "hsl(152 38% 38% / 0.08)",
  mobile_money: "hsl(210 70% 52% / 0.08)",
  card:         "hsl(280 60% 55% / 0.08)",
  credit:       "hsl(36 88% 52% / 0.08)",
};

const METHOD_BORDER_COLORS: Record<string, string> = {
  cash:         "hsl(152 38% 38% / 0.20)",
  mobile_money: "hsl(210 70% 52% / 0.20)",
  card:         "hsl(280 60% 55% / 0.20)",
  credit:       "hsl(36 88% 52% / 0.20)",
};

const METHOD_FALLBACK_COLORS = [
  "hsl(152, 38%, 38%)",
  "hsl(210, 70%, 52%)",
  "hsl(280, 60%, 55%)",
  "hsl(36, 88%, 52%)",
  "hsl(22, 72%, 48%)",
  "hsl(4, 72%, 52%)",
];

function getMethodColor(method: string, index: number): string {
  return METHOD_COLORS[method] ?? METHOD_FALLBACK_COLORS[index % METHOD_FALLBACK_COLORS.length];
}

function getMethodBgColor(method: string, color: string): string {
  return METHOD_BG_COLORS[method] ?? `${color}18`;
}

function getMethodBorderColor(method: string, color: string): string {
  return METHOD_BORDER_COLORS[method] ?? `${color}30`;
}

function getMethodIcon(method: string) {
  switch (method) {
    case "cash": return Banknote;
    case "mobile_money": return Smartphone;
    case "card": return CreditCard;
    default: return CreditCard;
  }
}

// ─── Tooltip personnalisé ──────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: PaymentMethodStat & { color: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const stat = item.payload;
  return (
    <div
      style={{
        background: "hsl(20 25% 10%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        borderRadius: "12px",
        padding: "12px 16px",
        minWidth: "160px",
        fontSize: "12px",
      }}
    >
      <p style={{ color: "white", fontWeight: "700", fontSize: "13px", marginBottom: "8px" }}>{stat.label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Montant</span>
          <span style={{ color: "white", fontWeight: "700", fontFamily: "Fraunces, Georgia, serif" }}>{formatFcfa(stat.total)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Part</span>
          <span style={{ color: "white", fontWeight: "600" }}>{(stat.pct ?? 0).toFixed(1)} %</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Transactions</span>
          <span style={{ color: "white", fontWeight: "600" }}>{stat.count}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Légende personnalisée ─────────────────────────────────────────────────────

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string }>;
}

function CustomPieLegend({ payload }: CustomLegendProps) {
  if (!payload?.length) return null;
  return (
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px",
        marginTop: "12px",
        padding: 0,
        listStyle: "none",
      }}
    >
      {payload.map((entry) => (
        <li
          key={entry.value}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              flexShrink: 0,
              background: entry.color,
            }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentTabProps {
  period: StatPeriod;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PaymentTab({ period }: PaymentTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["statistics", "payment-methods", period],
    queryFn: () => statisticsService.getPaymentMethods({ period }),
  });

  const [pieVisible, setPieVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [barVisible, setBarVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPieVisible(true), 30);
    const t2 = setTimeout(() => setDetailVisible(true), 150);
    const t3 = setTimeout(() => setCardsVisible(true), 200);
    const t4 = setTimeout(() => setBarVisible(true), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement des méthodes de paiement…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <TrendingUp className="w-8 h-8 opacity-25" />
        <p className="text-sm">Impossible de charger les données de paiement.</p>
      </div>
    );
  }

  const methods = data.data ?? [];
  const totalRevenue = data.total_revenue;

  const pieData = methods.map((m, i) => ({
    ...m,
    color: getMethodColor(m.method, i),
    name: m.label,
  }));

  return (
    <div className="space-y-6">

      {/* ── PieChart + Détail ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pie chart */}
        <div
          className="card-premium p-6"
          style={{
            borderTop: "3px solid hsl(22 72% 48%)",
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
                background: "hsl(22 72% 48% / 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard style={{ width: "16px", height: "16px", color: "hsl(22 72% 48%)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Répartition des paiements</h2>
              <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Part de chaque méthode sur le total</p>
            </div>
          </div>

          {methods.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <CreditCard className="w-8 h-8 opacity-25" />
              <p className="text-sm">Aucune donnée disponible</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="label"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend content={<CustomPieLegend />} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Total encaissé */}
          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Total encaissé</p>
            <p
              style={{
                fontSize: "18px",
                fontWeight: "700",
                fontFamily: "Fraunces, Georgia, serif",
                color: "hsl(var(--foreground))",
                letterSpacing: "-0.02em",
              }}
            >
              {formatFcfa(totalRevenue)}
            </p>
          </div>
        </div>

        {/* Détail par méthode */}
        <div
          className="card-premium p-6"
          style={{
            borderTop: "3px solid hsl(152 38% 38%)",
            opacity: detailVisible ? 1 : 0,
            transform: detailVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: "hsl(152 38% 38% / 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingCart style={{ width: "16px", height: "16px", color: "hsl(152 38% 38%)" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)" }}>Détail par méthode</h2>
              <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Montants et transactions</p>
            </div>
          </div>

          {methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 opacity-25" />
              <p className="text-sm">Aucune donnée disponible</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pieData.map((item, idx) => {
                const MethodIcon = getMethodIcon(item.method);
                const bgColor = getMethodBgColor(item.method, item.color);
                const borderColor = getMethodBorderColor(item.method, item.color);
                return (
                  <div
                    key={item.method}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      borderRadius: "12px",
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      opacity: detailVisible ? 1 : 0,
                      transform: detailVisible ? "translateY(0)" : "translateY(5px)",
                      transition: "opacity 0.35s ease, transform 0.35s ease",
                      transitionDelay: `${idx * 60}ms`,
                    }}
                  >
                    {/* Icône colorée */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: `${item.color}20`,
                      }}
                    >
                      <MethodIcon style={{ width: "16px", height: "16px", color: item.color }} />
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            fontFamily: "var(--font-heading)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            flexShrink: 0,
                            background: `${item.color}20`,
                            color: item.color,
                          }}
                        >
                          {(item.pct ?? 0).toFixed(1)} %
                        </span>
                      </div>

                      {/* Barre de progression gradient */}
                      <div
                        style={{
                          height: "6px",
                          borderRadius: "100px",
                          background: "hsl(var(--muted))",
                          overflow: "hidden",
                          marginBottom: "6px",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: "100px",
                            width: `${item.pct}%`,
                            background: `linear-gradient(90deg, ${item.color}, ${item.color}99)`,
                            transform: barVisible ? "scaleX(1)" : "scaleX(0)",
                            transformOrigin: "left",
                            transition: "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
                            transitionDelay: `${idx * 80}ms`,
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            fontFamily: "Fraunces, Georgia, serif",
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          {formatFcfa(item.total)}
                        </span>
                        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                          {item.count} transaction{item.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Cartes résumé ── */}
      {methods.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pieData.map((item, idx) => {
            const MethodIcon = getMethodIcon(item.method);
            const bgColor = getMethodBgColor(item.method, item.color);
            const borderColor = getMethodBorderColor(item.method, item.color);
            return (
              <div
                key={item.method}
                style={{
                  background: "hsl(var(--card))",
                  border: `1px solid hsl(var(--border))`,
                  borderTop: `3px solid ${item.color}`,
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
                  opacity: cardsVisible ? 1 : 0,
                  transform: cardsVisible ? "translateY(0)" : "translateY(12px)",
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                  transitionDelay: `${idx * 60}ms`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    {item.label}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: bgColor,
                    }}
                  >
                    <MethodIcon style={{ width: "14px", height: "14px", color: item.color }} />
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    fontFamily: "Fraunces, Georgia, serif",
                    color: "hsl(var(--foreground))",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  {formatFcfa(item.total)}
                </p>
                <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                  {item.count} transaction{item.count !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
