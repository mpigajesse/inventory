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

// Couleurs premium pour les méthodes de paiement
const METHOD_COLORS: Record<string, string> = {
  cash:         "hsl(152, 38%, 38%)",  // vert forêt
  mobile_money: "hsl(22, 72%, 48%)",   // cuivre/terracotta
  card:         "hsl(210, 70%, 52%)",  // bleu
  credit:       "hsl(4, 72%, 52%)",    // rouge
};

const METHOD_FALLBACK_COLORS = [
  "hsl(152, 38%, 38%)",
  "hsl(22, 72%, 48%)",
  "hsl(210, 70%, 52%)",
  "hsl(4, 72%, 52%)",
  "hsl(280, 55%, 52%)",
  "hsl(36, 88%, 52%)",
];

function getMethodColor(method: string, index: number): string {
  return METHOD_COLORS[method] ?? METHOD_FALLBACK_COLORS[index % METHOD_FALLBACK_COLORS.length];
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
  const total = stat.total;
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs min-w-[160px]"
      style={{
        background: "hsl(20 25% 10%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ color: "white", fontWeight: "700", fontSize: "13px", marginBottom: "8px" }}>{stat.label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Montant</span>
          <span style={{ color: "white", fontWeight: "700", fontFamily: "Fraunces, Georgia, serif" }}>{formatFcfa(total)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Part</span>
          <span style={{ color: "white", fontWeight: "600" }}>{stat.pct.toFixed(1)} %</span>
        </div>
        <div className="flex items-center justify-between gap-4">
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
    <ul className="flex flex-wrap justify-center gap-3 mt-3">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: entry.color }}
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

  // Entrance animation state
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

  // Données enrichies avec couleur pour le PieChart
  const pieData = methods.map((m, i) => ({
    ...m,
    color: getMethodColor(m.method, i),
    name: m.label,
  }));

  return (
    <div className="space-y-6">

      {/* ── PieChart + légende ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pie chart */}
        <div
          className="card-premium p-6"
          style={{
            opacity: pieVisible ? 1 : 0,
            transform: pieVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-heading">Répartition des paiements</h2>
              <p className="text-xs text-muted-foreground">Part de chaque méthode sur le total</p>
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
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend content={<CustomPieLegend />} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Total centré en-dessous */}
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">Total encaissé</p>
            <p className="text-lg font-bold font-editorial amount-editorial">
              {formatFcfa(totalRevenue)}
            </p>
          </div>
        </div>

        {/* Détail par méthode */}
        <div
          className="card-premium p-6"
          style={{
            opacity: detailVisible ? 1 : 0,
            transform: detailVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-heading">Détail par méthode</h2>
              <p className="text-xs text-muted-foreground">Montants et transactions</p>
            </div>
          </div>

          {methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <ShoppingCart className="w-8 h-8 opacity-25" />
              <p className="text-sm">Aucune donnée disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pieData.map((item, idx) => {
                const MethodIcon = getMethodIcon(item.method);
                return (
                  <div
                    key={item.method}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                    style={{
                      opacity: detailVisible ? 1 : 0,
                      transform: detailVisible ? "translateY(0)" : "translateY(5px)",
                      transition: `opacity 0.35s ease, transform 0.35s ease`,
                      transitionDelay: `${idx * 60}ms`,
                    }}
                  >
                    {/* Icône colorée */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${item.color}18` }}
                    >
                      <MethodIcon
                        className="w-4 h-4"
                        style={{ color: item.color }}
                      />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold font-heading truncate">
                          {item.label}
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: `${item.color}18`,
                            color: item.color,
                          }}
                        >
                          {item.pct.toFixed(1)} %
                        </span>
                      </div>

                      {/* Barre de progression animée */}
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.pct}%`,
                            background: item.color,
                            transform: barVisible ? "scaleX(1)" : "scaleX(0)",
                            transformOrigin: "left",
                            transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                            transitionDelay: `${idx * 80}ms`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {formatFcfa(item.total)}
                        </span>
                        <span>{item.count} transaction{item.count !== 1 ? "s" : ""}</span>
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
            return (
              <div
                key={item.method}
                className="card-premium p-4 flex flex-col gap-2"
                style={{
                  opacity: cardsVisible ? 1 : 0,
                  transform: cardsVisible ? "translateY(0)" : "translateY(12px)",
                  transition: `opacity 0.4s ease, transform 0.4s ease`,
                  transitionDelay: `${idx * 60}ms`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${item.color}18` }}
                  >
                    <MethodIcon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  </div>
                </div>
                <p className="text-base font-bold font-editorial amount-editorial leading-tight">
                  {formatFcfa(item.total)}
                </p>
                <p className="text-xs text-muted-foreground">
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
