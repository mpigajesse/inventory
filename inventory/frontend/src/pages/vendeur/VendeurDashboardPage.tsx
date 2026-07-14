import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Receipt,
  UserCheck,
  ShoppingBag,
  Zap,
  Sun,
  Sunset,
  Moon,
  Barcode,
} from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useCountUp } from "@/hooks/useCountUp";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { salesService } from "@/services/salesService";
import type { Sale } from "@/services/salesService";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFirstName(fullName: string | undefined): string {
  if (!fullName) return "Vendeur";
  const trimmed = fullName.trim();
  if (!trimmed) return "Vendeur";
  return trimmed.split(/\s+/)[0];
}

function getInitials(fullName: string | undefined): string {
  if (!fullName) return "V";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function getGreetingIcon(date: Date): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  const h = date.getHours();
  if (h < 12) return Sun;
  if (h < 18) return Sunset;
  return Moon;
}

// ─── Types & styles ───────────────────────────────────────────────────────────

type VendeurKpiTint = "copper" | "green" | "blue";

// Border-top accent colors per KPI tint
const kpiBorderTop: Record<VendeurKpiTint, string> = {
  copper: "hsl(22 72% 48%)",
  green: "hsl(var(--success))",
  blue: "hsl(var(--badge-blue))",
};

const tintStyles: Record<
  VendeurKpiTint,
  { iconBg: string; iconColor: string; gradientFrom: string; valueColor: string }
> = {
  copper: {
    iconBg: "hsl(22 72% 48% / 0.15)",
    iconColor: "hsl(22 72% 62%)",
    gradientFrom: "hsl(22 72% 48% / 0.07)",
    valueColor: "hsl(var(--foreground))",
  },
  green: {
    iconBg: "hsl(var(--success) / 0.15)",
    iconColor: "hsl(var(--success))",
    gradientFrom: "hsl(var(--success) / 0.06)",
    valueColor: "hsl(var(--foreground))",
  },
  blue: {
    iconBg: "hsl(var(--badge-blue) / 0.14)",
    iconColor: "hsl(var(--badge-blue))",
    gradientFrom: "hsl(var(--badge-blue) / 0.06)",
    valueColor: "hsl(var(--foreground))",
  },
};

interface VendeurKpiDef {
  label: string;
  numericEnd: number;
  suffix: string;
  duration: number;
  change: string;
  trendDir: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: VendeurKpiTint;
}

function KpiValue({
  end,
  suffix,
  duration,
  isMoney,
}: {
  end: number;
  suffix: string;
  duration: number;
  isMoney?: boolean;
}) {
  const counted = useCountUp({ end, duration });
  if (isMoney) {
    return (
      <span style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {counted.toLocaleString("fr-FR")}
        {suffix}
      </span>
    );
  }
  return (
    <>
      {counted.toLocaleString("fr-FR")}
      {suffix}
    </>
  );
}

// Easing for entrance animations
const ENTRANCE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VendeurDashboardPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { can } = usePermissions();

  // Mount flag drives all entrance animations
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const today = new Date();
  const fullName = currentUser?.name;
  const firstName = getFirstName(fullName);
  const initials = getInitials(fullName);
  const greeting = getGreeting(today);
  const GreetingIcon = getGreetingIcon(today);

  // ── Real API data ──────────────────────────────────────────────────────────

  const { data: dailyStats, isLoading: statsLoading } = useQuery({
    queryKey: ["vendeur-daily-stats", "today"],
    queryFn: () => salesService.getDailyStats("today"),
    refetchInterval: 60_000,
  });

  const { data: recentSalesData, isLoading: salesLoading } = useQuery({
    queryKey: ["vendeur-recent-sales", currentUser?.id],
    queryFn: () =>
      salesService.getAll({
        ordering: "-created_at",
        limit: "10",
      }),
    refetchInterval: 60_000,
  });

  const isLoading = statsLoading || salesLoading;

  // Find stats for the current user among all cashiers
  const myStats = dailyStats?.find(
    (s) => s.cashier_id === currentUser?.id
  );

  const myRevenue = myStats?.total_revenue ?? 0;
  const myTransactions = myStats?.sales_count ?? 0;
  // Unique clients: derive from recent sales (best-effort without a dedicated endpoint)
  const recentSales: Sale[] = recentSalesData?.results ?? [];
  const myClientsCount = new Set(
    recentSales.filter((s) => s.client !== null).map((s) => s.client)
  ).size;

  const vendeurKpis: VendeurKpiDef[] = [
    {
      label: "Mes ventes du jour",
      numericEnd: myRevenue,
      suffix: " F",
      duration: 1200,
      change: myTransactions > 0 ? `${myTransactions} transaction${myTransactions !== 1 ? "s" : ""}` : "Aucune vente",
      trendDir: myRevenue > 0 ? "up" : "neutral",
      icon: TrendingUp,
      tint: "copper",
    },
    {
      label: "Transactions",
      numericEnd: myTransactions,
      suffix: "",
      duration: 800,
      change: "Aujourd'hui",
      trendDir: myTransactions > 0 ? "up" : "neutral",
      icon: Receipt,
      tint: "green",
    },
    {
      label: "Clients servis",
      numericEnd: myClientsCount,
      suffix: "",
      duration: 800,
      change: "Aujourd'hui",
      trendDir: "neutral",
      icon: UserCheck,
      tint: "blue",
    },
  ];

  return (
    <>
      <Topbar
        title="Mon tableau de bord"
        subtitle="Espace vendeur"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">

        {/* ── Salutation personnalisée — entrance from left ── */}
        <div className="mb-7">
          <div
            className="flex items-center gap-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateX(0)" : "translateX(-12px)",
              transition: `opacity 400ms ${ENTRANCE_EASE}, transform 400ms ${ENTRANCE_EASE}`,
            }}
          >
            {/* Avatar — rounded-2xl 56×56, copper shadow */}
            <div
              className="relative flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "var(--gradient-primary)",
                boxShadow: "0 6px 16px hsl(22 72% 48% / 0.3)",
              }}
            >
              {initials}
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                style={{
                  background: "hsl(var(--success))",
                  borderColor: "hsl(var(--background))",
                }}
              />
            </div>

            {/* Text */}
            <div className="min-w-0">
              <p
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] mb-0.5"
                style={{ color: "hsl(var(--primary))" }}
              >
                <GreetingIcon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                {greeting}
              </p>
              <h1
                className="font-extrabold font-heading truncate"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                {firstName}
              </h1>
              <p
                className="mt-0.5 capitalize"
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.4,
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                }}
              >
                {formatLongDate(today)} · Bonne journée de ventes !
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI cards — stagger in ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
          {isLoading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="w-10 h-10 rounded-xl" />
                  </div>
                  <Skeleton className="h-9 w-28 mb-3" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </>
          ) : vendeurKpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const t = tintStyles[kpi.tint];
            const borderTopColor = kpiBorderTop[kpi.tint];
            const delay = 200 + index * 80;
            const isMoney = kpi.suffix.includes("F");
            return (
              <div
                key={kpi.label}
                className="relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(12px)",
                  transition: `opacity 400ms ${ENTRANCE_EASE} ${delay}ms, transform 400ms ${ENTRANCE_EASE} ${delay}ms`,
                  boxShadow:
                    "0 1px 2px hsl(20 25% 12% / 0.04), 0 2px 12px hsl(22 72% 48% / 0.04)",
                  // Colored top border accent
                  borderTop: `3px solid ${borderTopColor}`,
                }}
              >
                {/* Gradient overlay */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${t.gradientFrom}, transparent)`,
                  }}
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span
                      className="font-semibold uppercase"
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {kpi.label}
                    </span>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: t.iconBg }}
                    >
                      <Icon
                        className="w-5 h-5"
                        strokeWidth={2.1}
                        style={{ color: t.iconColor }}
                      />
                    </div>
                  </div>

                  <div
                    className="text-[1.7rem] md:text-[1.95rem] font-bold leading-none tracking-tight tabular-nums"
                    style={{ color: t.valueColor }}
                  >
                    <KpiValue
                      end={kpi.numericEnd}
                      suffix={kpi.suffix}
                      duration={kpi.duration}
                      isMoney={isMoney}
                    />
                  </div>

                  <div className="mt-3 flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        kpi.trendDir === "up" &&
                          "bg-success/12 text-success",
                        kpi.trendDir === "down" &&
                          "bg-destructive/12 text-destructive",
                        kpi.trendDir === "neutral" &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {kpi.trendDir === "up" && (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {kpi.trendDir === "down" && (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {kpi.trendDir === "neutral" && (
                        <Minus className="w-3 h-3" />
                      )}
                      {kpi.change}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CTA Caisse — slides up with delay ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 md:p-8 mb-7"
          style={{
            background:
              "linear-gradient(135deg, hsl(20 30% 8%), hsl(22 26% 13%))",
            boxShadow: "0 4px 24px hsl(0 0% 0% / 0.18)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: `opacity 400ms ${ENTRANCE_EASE} 400ms, transform 400ms ${ENTRANCE_EASE} 400ms`,
          }}
        >
          {/* Diagonal stripe pattern overlay — opacité 0.06 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(22 72% 62%) 0px, hsl(22 72% 62%) 1px, transparent 1px, transparent 12px)",
              opacity: 0.06,
            }}
          />

          {/* Decorative glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, hsl(22 72% 48%), transparent 70%)",
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  boxShadow: "0 8px 24px hsl(22 72% 48% / 0.45)",
                }}
              >
                <ShoppingCart className="w-8 h-8 text-white" strokeWidth={2} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap
                    className="w-3.5 h-3.5"
                    style={{ color: "hsl(36 88% 60%)" }}
                  />
                  <span
                    className="font-bold uppercase"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.18em",
                      color: "hsl(36 88% 60%)",
                    }}
                  >
                    Action rapide
                  </span>
                </div>
                <h2
                  className="font-heading mb-1"
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "white",
                    lineHeight: 1.2,
                  }}
                >
                  Accéder à la caisse
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "hsl(0 0% 100% / 0.5)" }}
                >
                  Scanner les produits et enregistrer les ventes
                </p>
              </div>
            </div>

            {/* Caisse CTA button — rounded-xl with strong copper shadow */}
            <button
              onClick={() => navigate("/vendeur/pos")}
              className="group inline-flex items-center justify-center gap-2 shrink-0 font-bold text-[15px] text-white transition-all active:scale-[0.97] animate-glow-pulse"
              style={{
                background:
                  "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                borderRadius: "14px",
                padding: "14px 24px",
                boxShadow: "0 8px 24px hsl(22 72% 48% / 0.45)",
              }}
            >
              <ShoppingCart className="w-4.5 h-4.5" strokeWidth={2.2} />
              Ouvrir la caisse
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ── Accès rapide — Étiquettes codes-barres ── */}
        {can("view_barcodes") && (
          <div
            className="mb-7"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 400ms ${ENTRANCE_EASE} 480ms, transform 400ms ${ENTRANCE_EASE} 480ms`,
            }}
          >
            <div className="border-l-2 border-primary/30 pl-3 mb-4">
              <p
                className="font-semibold uppercase mb-0.5"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Accès rapide
              </p>
              <h2 className="text-base md:text-lg font-bold tracking-tight">
                Outils
              </h2>
            </div>

            <button
              onClick={() => navigate("/vendeur/barcodes")}
              className="group flex items-center gap-4 w-full text-left rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{
                boxShadow:
                  "0 1px 2px hsl(20 25% 12% / 0.04), 0 2px 12px hsl(22 72% 48% / 0.04)",
                borderTop: "3px solid hsl(var(--badge-blue))",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--badge-blue) / 0.14)" }}
              >
                <Barcode
                  className="w-6 h-6"
                  strokeWidth={2}
                  style={{ color: "hsl(var(--badge-blue))" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">Étiquettes</p>
                <p
                  className="text-[12px] mt-0.5"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Imprimer les codes-barres
                </p>
              </div>
              <ArrowRight
                className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all"
                style={{ color: "hsl(var(--muted-foreground))" }}
              />
            </button>
          </div>
        )}

        {/* ── Mes dernières ventes ── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="border-l-2 border-primary/30 pl-3">
              <p
                className="font-semibold uppercase mb-0.5"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                Activité
              </p>
              <h2 className="text-base md:text-lg font-bold tracking-tight">
                Mes dernières ventes
              </h2>
            </div>
            <StatusBadge label="Aujourd'hui" variant="info" />
          </div>

          <div
            className="bg-card rounded-2xl border overflow-hidden"
            style={{ boxShadow: "0 2px 12px hsl(22 72% 48% / 0.05)" }}
          >
            {salesLoading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="p-10 text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-muted items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold">
                  Aucune vente pour le moment
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vos ventes de la journée apparaîtront ici.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y">
                  {recentSales.map((sale, index) => {
                    const rowDelay = 200 + index * 40;
                    const heure = new Date(sale.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={sale.id}
                        className="p-4 flex items-start justify-between gap-3 cursor-pointer"
                        style={{
                          opacity: mounted ? 1 : 0,
                          transition: `opacity 300ms ease ${rowDelay}ms`,
                          background: "transparent",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "hsl(22 72% 48% / 0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        onClick={() => navigate("/vendeur/invoices")}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {sale.invoice_number ?? `VNT-${sale.id}`}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {heure} · {sale.items.length} article
                              {sale.items.length !== 1 ? "s" : ""}
                            </p>
                            <p
                              className="mt-1 tabular-nums font-bold text-sm"
                              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                            >
                              {sale.total_amount.toLocaleString("fr-FR")} FCFA
                            </p>
                          </div>
                        </div>
                        <StatusBadge label="Terminée" variant="success" />
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {["Réf.", "Heure", "Articles", "Total", "Statut"].map(
                          (col, i) => (
                            <th
                              key={col}
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                textAlign: i === 3 ? "right" : undefined,
                              }}
                            >
                              {col}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((sale, index) => {
                        const rowDelay = 200 + index * 40;
                        const heure = new Date(sale.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <tr
                            key={sale.id}
                            className="cursor-pointer"
                            style={{
                              opacity: mounted ? 1 : 0,
                              transition: `opacity 300ms ease ${rowDelay}ms, background 150ms ease`,
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "hsl(22 72% 48% / 0.05)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                            onClick={() => navigate("/vendeur/invoices")}
                          >
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="font-semibold">
                                  {sale.invoice_number ?? `VNT-${sale.id}`}
                                </span>
                              </div>
                            </td>
                            <td className="text-muted-foreground tabular-nums">
                              {heure}
                            </td>
                            <td className="tabular-nums">{sale.items.length}</td>
                            <td className="text-right">
                              <span
                                className="font-bold tabular-nums"
                                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                              >
                                {sale.total_amount.toLocaleString("fr-FR")} FCFA
                              </span>
                            </td>
                            <td>
                              <StatusBadge label="Terminée" variant="success" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="px-5 py-3 border-t bg-secondary/30">
              <button
                onClick={() => navigate("/vendeur/invoices")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Voir toutes mes factures
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
