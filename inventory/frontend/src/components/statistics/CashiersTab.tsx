import React, { useState, useEffect } from "react";
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

// ─── Rank badge config ─────────────────────────────────────────────────────────

const RANK_CONFIG: Record<number, { bg: string; color: string; border: string }> = {
  1: {
    bg: "hsl(42 88% 52% / 0.15)",
    color: "hsl(42 88% 42%)",
    border: "1px solid hsl(42 88% 52% / 0.35)",
  },
  2: {
    bg: "hsl(0 0% 65% / 0.15)",
    color: "hsl(0 0% 45%)",
    border: "1px solid hsl(0 0% 65% / 0.35)",
  },
  3: {
    bg: "hsl(22 50% 45% / 0.15)",
    color: "hsl(22 50% 38%)",
    border: "1px solid hsl(22 50% 45% / 0.30)",
  },
};

function getRankStyle(rank: number) {
  return RANK_CONFIG[rank] ?? {
    bg: "hsl(var(--muted) / 0.5)",
    color: "hsl(var(--muted-foreground) / 0.6)",
    border: "1px solid transparent",
  };
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
  rowVisible: boolean;
  rowDelay: number;
  barVisible: boolean;
  barDelay: number;
}

function CashierRow({ stat, isTop, revenuePct, rank, rowVisible, rowDelay, barVisible, barDelay }: CashierRowProps) {
  const rankStyle = getRankStyle(rank);

  return (
    <tr
      style={{
        borderBottom: "1px solid hsl(var(--border))",
        opacity: rowVisible ? 1 : 0,
        transform: rowVisible ? "translateY(0)" : "translateY(5px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, background 0.15s ease",
        transitionDelay: `${rowDelay}ms`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = "hsl(22 72% 48% / 0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
      }}
    >
      {/* Rang */}
      <td style={{ padding: "10px 12px", width: "44px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            fontSize: "11px",
            fontWeight: "700",
            fontFamily: "var(--font-heading)",
            background: rankStyle.bg,
            color: rankStyle.color,
            border: rankStyle.border,
            transform: rowVisible ? "scale(1)" : "scale(0)",
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transitionDelay: `${rowDelay + 60}ms`,
          }}
        >
          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
        </span>
      </td>

      {/* Nom + badge Top */}
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: isTop
                ? "linear-gradient(135deg, hsl(42 88% 48%), hsl(22 72% 52%))"
                : "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
              boxShadow: isTop
                ? "0 2px 8px hsl(42 88% 52% / 0.35)"
                : "0 2px 8px hsl(22 72% 48% / 0.25)",
            }}
          >
            <Users style={{ width: "13px", height: "13px", color: "white" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: "12px",
                fontWeight: "600",
                fontFamily: "var(--font-heading)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "hsl(var(--foreground))",
                maxWidth: "120px",
              }}
            >
              {stat.cashier_name}
            </p>
            {isTop && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "hsl(42 88% 42%)",
                  background: "hsl(42 88% 52% / 0.1)",
                  border: "1px solid hsl(42 88% 52% / 0.2)",
                  borderRadius: "999px",
                  padding: "2px 6px",
                  marginTop: "2px",
                }}
              >
                <Trophy style={{ width: "9px", height: "9px" }} />
                <span>Top</span>
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Ventes — masqué sur très petit mobile */}
      <td className="hidden sm:table-cell" style={{ padding: "10px 12px", textAlign: "right", fontSize: "12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "500", color: "hsl(var(--foreground))" }}>
          <ShoppingCart style={{ width: "12px", height: "12px", color: "hsl(var(--muted-foreground))" }} />
          {stat.total_sales}
        </span>
      </td>

      {/* Revenus + barre gradient */}
      <td style={{ padding: "10px 12px", minWidth: "140px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              fontFamily: "Fraunces, Georgia, serif",
              color: "hsl(22 72% 48%)",
              letterSpacing: "-0.01em",
              display: "block",
              textAlign: "right",
            }}
          >
            {formatFcfa(stat.total_revenue)}
          </span>
          <div
            style={{
              height: "5px",
              borderRadius: "100px",
              background: "hsl(var(--muted))",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: "100px",
                width: `${revenuePct}%`,
                background: isTop
                  ? "linear-gradient(90deg, hsl(42 88% 52%), hsl(22 72% 48%))"
                  : "linear-gradient(90deg, hsl(22 72% 48%), hsl(30 82% 58%))",
                transform: barVisible ? "scaleX(1)" : "scaleX(0)",
                transformOrigin: "left",
                transition: "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: `${barDelay}ms`,
              }}
            />
          </div>
        </div>
      </td>

      {/* Panier moyen — masqué sur mobile */}
      <td
        className="hidden md:table-cell"
        style={{
          padding: "10px 12px",
          textAlign: "right",
          fontSize: "12px",
          fontWeight: "500",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        {formatFcfa(stat.avg_basket)}
      </td>

      {/* Articles / vente — masqué sur mobile */}
      <td
        className="hidden lg:table-cell"
        style={{
          padding: "10px 12px",
          textAlign: "right",
          fontSize: "12px",
          color: "hsl(var(--muted-foreground))",
        }}
      >
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

  const [headerVisible, setHeaderVisible] = useState(false);
  const [rowsVisible, setRowsVisible] = useState(false);
  const [barVisible, setBarVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHeaderVisible(true), 30);
    const t2 = setTimeout(() => setRowsVisible(true), 80);
    const t3 = setTimeout(() => setBarVisible(true), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
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
          <Users style={{ width: "16px", height: "16px", color: "hsl(22 72% 48%)" }} />
        </div>
        <div>
          <h2 style={{ fontSize: "13px", fontWeight: "600", fontFamily: "var(--font-heading)", color: "hsl(var(--foreground))" }}>
            Performances caissiers
          </h2>
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
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
        <div
          className="card-premium overflow-hidden"
          style={{
            borderTop: "3px solid hsl(22 72% 48%)",
          }}
        >
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "hsl(var(--muted) / 0.5)",
                    borderBottom: "1px solid hsl(var(--border))",
                  }}
                >
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                      width: "44px",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Caissier
                  </th>
                  <th
                    className="hidden sm:table-cell"
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Ventes
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                      minWidth: "140px",
                    }}
                  >
                    Revenus
                  </th>
                  <th
                    className="hidden md:table-cell"
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Panier moy.
                  </th>
                  <th
                    className="hidden lg:table-cell"
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontSize: "11px",
                      fontWeight: "700",
                      fontFamily: "var(--font-heading)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Art./vente
                  </th>
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
                      rowVisible={rowsVisible}
                      rowDelay={idx * 45}
                      barVisible={barVisible}
                      barDelay={idx * 80}
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
