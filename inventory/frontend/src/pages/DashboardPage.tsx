import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardStats } from "@/services/dashboardService";
import type { Sale } from "@/services/salesService";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Trophy,
  Users,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ data, tint = "primary", className }: { data: number[]; tint?: "primary" | "accent" | "warning" | "info"; className?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const tintMap: Record<string, { active: string; muted: string }> = {
    primary: { active: "bg-primary", muted: "bg-primary/20" },
    accent: { active: "bg-accent", muted: "bg-accent/20" },
    warning: { active: "bg-warning", muted: "bg-warning/20" },
    info: { active: "bg-[hsl(var(--badge-blue))]", muted: "bg-[hsl(var(--badge-blue))]/20" },
  };
  const tc = tintMap[tint];

  return (
    <div className={cn("flex items-end gap-[3px] h-7", className)}>
      {data.map((val, i) => {
        const heightPct = ((val - min) / range) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-[2px] transition-all duration-300",
              isLast ? tc.active : tc.muted
            )}
            style={{ height: `${Math.max(18, heightPct)}%` }}
          />
        );
      })}
    </div>
  );
}

function KpiValue({ end, suffix, duration }: { end: number; suffix: string; duration: number }) {
  const counted = useCountUp({ end, duration });
  return <>{counted}{suffix}</>;
}

type KpiTint = "primary" | "accent" | "warning" | "info";

interface PremiumKpiProps {
  label: string;
  value: number;
  suffix: string;
  duration: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: KpiTint;
  spark?: number[];
  delay?: number;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
}

const tintStyles: Record<KpiTint, {
  iconBg: string;
  iconFg: string;
  ring: string;
  gradient: string;
  valueTone: string;
}> = {
  primary: {
    iconBg: "bg-primary/12",
    iconFg: "text-primary",
    ring: "ring-primary/20",
    gradient: "from-primary/[0.07] via-transparent",
    valueTone: "text-foreground",
  },
  accent: {
    iconBg: "bg-accent/14",
    iconFg: "text-accent",
    ring: "ring-accent/20",
    gradient: "from-accent/[0.07] via-transparent",
    valueTone: "text-foreground",
  },
  warning: {
    iconBg: "bg-warning/18",
    iconFg: "text-warning",
    ring: "ring-warning/30",
    gradient: "from-warning/[0.08] via-transparent",
    valueTone: "text-foreground",
  },
  info: {
    iconBg: "bg-[hsl(var(--badge-blue))]/14",
    iconFg: "text-[hsl(var(--badge-blue))]",
    ring: "ring-[hsl(var(--badge-blue))]/20",
    gradient: "from-[hsl(var(--badge-blue))]/[0.07] via-transparent",
    valueTone: "text-foreground",
  },
};

function PremiumKpi({
  label,
  value,
  suffix,
  duration,
  hint,
  icon: Icon,
  tint,
  spark,
  delay = 0,
  trend,
}: PremiumKpiProps) {
  const t = tintStyles[tint];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card p-5 md:p-6",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        "focus-within:ring-2",
        t.ring,
      )}
      style={{
        animation: "fadeInUp 0.45s ease-out both",
        animationDelay: `${delay}ms`,
        boxShadow: "0 1px 2px hsl(20 25% 12% / 0.04), 0 2px 12px hsl(22 72% 48% / 0.04)",
      }}
    >
      {/* soft diagonal wash */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80",
          t.gradient,
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              t.iconBg,
            )}
          >
            <Icon className={cn("w-5 h-5", t.iconFg)} />
          </div>
        </div>

        <div className={cn("text-[1.65rem] md:text-[1.9rem] font-bold leading-none tracking-tight tabular-nums", t.valueTone)}>
          <KpiValue key={`${label}-${value}`} end={value} suffix={suffix} duration={duration} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground font-medium truncate">{hint}</p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                trend.direction === "up" && "bg-success/12 text-success",
                trend.direction === "down" && "bg-destructive/12 text-destructive",
                trend.direction === "neutral" && "bg-muted text-muted-foreground",
              )}
            >
              {trend.direction === "up" && <ArrowUpRight className="w-3 h-3" />}
              {trend.direction === "down" && <ArrowUpRight className="w-3 h-3 rotate-90" />}
              {trend.label}
            </span>
          )}
        </div>

        {spark && spark.length > 0 && (
          <Sparkline data={spark} tint={tint} className="mt-4" />
        )}
      </div>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32 mb-3" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-6 w-full mt-4 rounded-sm" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded" />
      ))}
    </div>
  );
}

function SectionHeader({ title, kicker, right }: { title: string; kicker?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="border-l-4 border-primary pl-3">
        {kicker && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">
            {kicker}
          </p>
        )}
        <h2 className="text-base md:text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.getStats(),
    refetchInterval: 60_000,
  });

  // Derive sparkline from sales_by_day (last 7 entries, or fewer)
  const daySpark = (stats?.sales_by_day ?? []).slice(-7).map((d) => d.total);
  const daySparkFilled = daySpark.length > 0 ? daySpark : [0];

  // KPI values from API
  const todayRevenue = stats?.today.revenue ?? 0;
  const todayCount = stats?.today.sales_count ?? 0;
  const monthRevenue = stats?.month.revenue ?? 0;
  const monthCount = stats?.month.sales_count ?? 0;
  const avgCartToday = todayCount > 0 ? Math.round(todayRevenue / todayCount) : 0;
  const lowCount = stats?.stock.low_count ?? 0;
  const totalClients = stats?.clients.total ?? 0;

  // recent_sales typed as Sale[]
  const recentSales = (stats?.recent_sales ?? []) as Sale[];

  // top products
  const topProducts = stats?.top_products ?? [];
  const maxTopSold = topProducts.length > 0
    ? Math.max(...topProducts.map((p) => p.total_sold))
    : 0;

  // Top product progress bar tints (rotating palette — African contemporary)
  const rankTints = ["bg-primary", "bg-accent", "bg-warning", "bg-[hsl(var(--badge-blue))]"];

  const today = new Date();

  return (
    <>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Header premium ── */}
        <div className="mb-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="capitalize">{formatLongDate(today)}</span>
                </span>
              </div>
              <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight">
                Bonjour, voici votre activité
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Suivi en temps réel des ventes, du stock et de votre boutique.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/reports")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border bg-card text-sm font-semibold hover:bg-secondary/60 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Rapports
              </button>
              <button
                onClick={() => navigate("/pos")}
                className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all"
                style={{ boxShadow: "0 6px 20px hsl(22 72% 48% / 0.22)" }}
              >
                <ShoppingCart className="w-4 h-4" />
                Ouvrir la caisse
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <PremiumKpi
                label="Ventes aujourd'hui"
                value={todayRevenue}
                suffix=" FCFA"
                duration={1200}
                hint={`${todayCount} transaction${todayCount !== 1 ? "s" : ""}`}
                icon={DollarSign}
                tint="primary"
                spark={daySparkFilled}
                delay={0}
                trend={todayCount > 0 ? { direction: "up", label: "Actif" } : undefined}
              />
              <PremiumKpi
                label="CA ce mois"
                value={monthRevenue}
                suffix=" FCFA"
                duration={1200}
                hint={`${monthCount} transaction${monthCount !== 1 ? "s" : ""}`}
                icon={TrendingUp}
                tint="accent"
                spark={daySparkFilled}
                delay={80}
              />
              <PremiumKpi
                label="Panier moyen"
                value={avgCartToday}
                suffix=" FCFA"
                duration={1000}
                hint="Basé sur aujourd'hui"
                icon={ShoppingCart}
                tint="info"
                spark={daySparkFilled}
                delay={160}
              />
              <PremiumKpi
                label="Clients"
                value={totalClients}
                suffix=""
                duration={800}
                hint={lowCount > 0 ? `${lowCount} produit${lowCount !== 1 ? "s" : ""} en stock bas` : "Stock OK"}
                icon={Users}
                tint={lowCount > 0 ? "warning" : "accent"}
                delay={240}
                trend={lowCount > 0 ? { direction: "down", label: `${lowCount} alerte${lowCount !== 1 ? "s" : ""}` } : { direction: "up", label: "OK" }}
              />
            </>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ventes récentes (span 2) */}
          <div className="lg:col-span-2">
            <SectionHeader
              kicker="Activité"
              title="Ventes récentes"
              right={
                <button
                  onClick={() => navigate("/invoices")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Voir tout →
                </button>
              }
            />
            <div className="bg-card rounded-2xl border overflow-hidden" style={{ boxShadow: "0 2px 12px hsl(22 72% 48% / 0.05)" }}>
              {isLoading ? (
                <TableSkeleton rows={5} />
              ) : recentSales.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="inline-flex w-12 h-12 rounded-2xl bg-muted items-center justify-center mb-3">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold">Aucune vente pour le moment</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les ventes enregistrées apparaîtront ici.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile cards — md:hidden */}
                  <div className="md:hidden divide-y">
                    {recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-4 flex items-start justify-between gap-3 hover:bg-secondary/40 transition-colors"
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
                              {formatDate(sale.created_at)} · {sale.items.length} article{sale.items.length !== 1 ? "s" : ""}
                            </p>
                            <p className="text-sm font-bold mt-1 tabular-nums">
                              {formatFcfa(sale.total_amount)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge label="Terminée" variant="success" />
                      </div>
                    ))}
                  </div>
                  {/* Desktop table — hidden md:block */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Réf.</th>
                          <th>Date</th>
                          <th>Articles</th>
                          <th className="text-right">Total</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSales.map((sale) => (
                          <tr key={sale.id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="font-semibold">
                                  {sale.invoice_number ?? `VNT-${sale.id}`}
                                </span>
                              </div>
                            </td>
                            <td className="text-muted-foreground">{formatDate(sale.created_at)}</td>
                            <td className="tabular-nums">{sale.items.length}</td>
                            <td className="font-semibold tabular-nums text-right">{formatFcfa(sale.total_amount)}</td>
                            <td><StatusBadge label="Terminée" variant="success" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-6">

            {/* Widget Alertes stock */}
            <div>
              <SectionHeader
                kicker="Stock"
                title="Alertes"
                right={
                  !isLoading && lowCount > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold">
                      {lowCount}
                    </span>
                  ) : null
                }
              />
              <div
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden",
                  !isLoading && lowCount > 0 && "border-warning/40",
                )}
                style={{
                  boxShadow: !isLoading && lowCount > 0
                    ? "0 2px 12px hsl(36 88% 52% / 0.12)"
                    : "0 2px 12px hsl(22 72% 48% / 0.05)",
                }}
              >
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded" />
                    ))}
                  </div>
                ) : lowCount === 0 ? (
                  <div className="p-6 text-center">
                    <div className="inline-flex w-11 h-11 rounded-2xl bg-success/12 items-center justify-center mb-2">
                      <Package className="w-5 h-5 text-success" />
                    </div>
                    <p className="text-sm font-semibold">Tout est en ordre</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Stock suffisant pour tous les produits.
                    </p>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          <span className="text-destructive">{lowCount}</span>{" "}
                          produit{lowCount !== 1 ? "s" : ""} sous le seuil
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vérifiez et réapprovisionnez pour éviter les ruptures.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/stock")}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 active:scale-[0.98] transition-all"
                    >
                      Gérer le stock
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Widget Top produits */}
            <div>
              <SectionHeader
                kicker="Performance"
                title="Top produits"
                right={<Trophy className="w-4 h-4 text-warning" />}
              />
              <div className="rounded-2xl border bg-card overflow-hidden" style={{ boxShadow: "0 2px 12px hsl(22 72% 48% / 0.05)" }}>
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded" />
                    ))}
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="inline-flex w-11 h-11 rounded-2xl bg-muted items-center justify-center mb-2">
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold">Pas encore de classement</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les ventes alimenteront le top produits.
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {topProducts.slice(0, 5).map((p, i) => {
                      const barTint = rankTints[i % rankTints.length];
                      const pct = maxTopSold > 0 ? Math.max(8, (p.total_sold / maxTopSold) * 100) : 0;
                      return (
                        <div
                          key={p.product__name}
                          className="group relative p-3 rounded-xl hover:bg-secondary/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold shrink-0",
                                i === 0 && "bg-primary text-primary-foreground",
                                i === 1 && "bg-accent text-accent-foreground",
                                i === 2 && "bg-warning text-[hsl(var(--warning-foreground))]",
                                i > 2 && "bg-muted text-muted-foreground",
                              )}
                            >
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-xs font-semibold truncate">
                                  {p.product__name}
                                </p>
                                <p className="text-[11px] font-bold tabular-nums shrink-0">
                                  {p.total_sold}
                                </p>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-500", barTint)}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                                {formatFcfa(p.revenue)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="px-4 py-3 border-t bg-secondary/30">
                  <button
                    onClick={() => navigate("/reports")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Voir les rapports détaillés
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
