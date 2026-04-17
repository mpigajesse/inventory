import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardStats } from "@/services/dashboardService";
import type { Sale } from "@/services/salesService";
import { activityService } from "@/services/activityService";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Trophy,
  Users,
  BarChart2,
  ShieldCheck,
  Calendar,
  Loader2,
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
  const str = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({
  data,
  tint = "primary",
  className,
}: {
  data: number[];
  tint?: "primary" | "accent" | "warning" | "info";
  className?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const tintMap: Record<string, { active: string; muted: string }> = {
    primary: { active: "bg-primary", muted: "bg-primary/20" },
    accent: { active: "bg-accent", muted: "bg-accent/20" },
    warning: { active: "bg-warning", muted: "bg-warning/20" },
    info: {
      active: "bg-[hsl(var(--badge-blue))]",
      muted: "bg-[hsl(var(--badge-blue))]/20",
    },
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

function KpiValue({
  end,
  suffix,
  duration,
}: {
  end: number;
  suffix: string;
  duration: number;
}) {
  const counted = useCountUp({ end, duration });
  return (
    <>
      {counted}
      {suffix}
    </>
  );
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

const tintConfig: Record<
  KpiTint,
  {
    iconGradient: string;
    iconShadow: string;
    glow: string;
    trendUpBg: string;
    trendUpColor: string;
    sparkTint: KpiTint;
  }
> = {
  primary: {
    iconGradient:
      "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
    iconShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
    glow: "radial-gradient(circle, hsl(22 72% 48% / 0.06) 0%, transparent 70%)",
    trendUpBg: "hsl(152 38% 38% / 0.1)",
    trendUpColor: "hsl(152 38% 38%)",
    sparkTint: "primary",
  },
  accent: {
    iconGradient:
      "linear-gradient(135deg, hsl(152 38% 38%), hsl(152 50% 48%))",
    iconShadow: "0 4px 14px hsl(152 38% 38% / 0.3)",
    glow: "radial-gradient(circle, hsl(152 38% 38% / 0.06) 0%, transparent 70%)",
    trendUpBg: "hsl(152 38% 38% / 0.1)",
    trendUpColor: "hsl(152 38% 38%)",
    sparkTint: "accent",
  },
  warning: {
    iconGradient:
      "linear-gradient(135deg, hsl(36 88% 52%), hsl(42 95% 58%))",
    iconShadow: "0 4px 14px hsl(36 88% 52% / 0.35)",
    glow: "radial-gradient(circle, hsl(36 88% 52% / 0.07) 0%, transparent 70%)",
    trendUpBg: "hsl(36 88% 52% / 0.12)",
    trendUpColor: "hsl(36 70% 38%)",
    sparkTint: "warning",
  },
  info: {
    iconGradient:
      "linear-gradient(135deg, hsl(var(--badge-blue)), hsl(218 80% 58%))",
    iconShadow: "0 4px 14px hsl(var(--badge-blue) / 0.3)",
    glow: "radial-gradient(circle, hsl(var(--badge-blue) / 0.06) 0%, transparent 70%)",
    trendUpBg: "hsl(152 38% 38% / 0.1)",
    trendUpColor: "hsl(152 38% 38%)",
    sparkTint: "info",
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
  const tc = tintConfig[tint];
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl cursor-default"
      style={{
        background: "linear-gradient(160deg, hsl(0 0% 100%), hsl(30 20% 98%))",
        borderTop: "none",
        borderLeft: "none",
        borderBottom: "1px solid hsl(var(--border) / 0.5)",
        borderRight: "1px solid hsl(var(--border) / 0.5)",
        boxShadow:
          "0 2px 8px hsl(22 30% 15% / 0.06), 0 8px 24px hsl(22 30% 15% / 0.04)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms, box-shadow 0.3s ease`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow =
          "0 8px 24px hsl(22 30% 15% / 0.12), 0 16px 48px hsl(22 30% 15% / 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 2px 8px hsl(22 30% 15% / 0.06), 0 8px 24px hsl(22 30% 15% / 0.04)";
      }}
    >
      {/* Gradient overlay décoratif */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: tc.glow,
          transform: "translate(30%, -30%)",
        }}
      />

      <div className="relative p-5 md:p-6">
        {/* Header: icon + trend */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: tc.iconGradient,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px hsl(22 72% 48% / 0.2)`,
            }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          {trend && (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background:
                  trend.direction === "up"
                    ? tc.trendUpBg
                    : trend.direction === "down"
                    ? "hsl(4 72% 52% / 0.1)"
                    : "hsl(var(--muted))",
                color:
                  trend.direction === "up"
                    ? tc.trendUpColor
                    : trend.direction === "down"
                    ? "hsl(4 72% 52%)"
                    : "hsl(var(--muted-foreground))",
              }}
            >
              {trend.direction === "up" && (
                <TrendingUp className="w-3 h-3 inline mr-0.5 mb-0.5" />
              )}
              {trend.direction === "down" && (
                <TrendingDown className="w-3 h-3 inline mr-0.5 mb-0.5" />
              )}
              {trend.direction === "neutral" && (
                <Minus className="w-3 h-3 inline mr-0.5 mb-0.5" />
              )}
              {trend.label}
            </span>
          )}
        </div>

        {/* Valeur principale — chiffres proéminents */}
        <div
          className="tabular-nums text-foreground mb-1 leading-none"
          style={{
            fontFamily: "'Fraunces', 'Georgia', serif",
            fontSize: "clamp(1.6rem, 3vw, 2rem)",
            fontWeight: "700",
            letterSpacing: "-0.03em",
          }}
        >
          <KpiValue key={`${label}-${value}`} end={value} suffix={suffix} duration={duration} />
        </div>

        {/* Label */}
        <p className="font-semibold uppercase text-muted-foreground mt-2" style={{ fontSize: "10px", letterSpacing: "0.1em" }}>
          {label}
        </p>

        {/* Hint */}
        {hint && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{hint}</p>
        )}

        {/* Sparkline */}
        {spark && spark.length > 0 && (
          <Sparkline data={spark} tint={tc.sparkTint} className="mt-4" />
        )}
      </div>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-11 h-11 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-36 mb-2" />
      <Skeleton className="h-3 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
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

function SectionHeader({
  title,
  kicker,
  right,
  animDelay = 0,
}: {
  title: string;
  kicker?: string;
  right?: React.ReactNode;
  animDelay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50 + animDelay);
    return () => clearTimeout(timer);
  }, [animDelay]);

  return (
    <div
      className="flex items-center gap-3 mb-4"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateX(0)" : "translateX(-8px)",
        transition: `opacity 0.35s ease ${animDelay}ms, transform 0.35s ease ${animDelay}ms`,
      }}
    >
      <div
        className="shrink-0 rounded-sm"
        style={{
          width: "3px",
          height: "20px",
          borderRadius: "2px",
          background:
            "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
        }}
      />
      <div>
        {kicker && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground leading-none mb-0.5">
            {kicker}
          </p>
        )}
        <h2
          className="text-base md:text-[0.95rem] font-bold text-foreground leading-none"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
      </div>
      <div className="flex-1 h-px bg-border/60 ml-1" />
      {right}
    </div>
  );
}

// ─── Stock alert banner ───────────────────────────────────────────────────────

function StockAlertBanner({ lowCount }: { lowCount: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl mb-6 border"
      style={{
        background: "hsl(36 88% 52% / 0.1)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderColor: "hsl(36 88% 52% / 0.3)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "hsl(36 88% 52% / 0.15)" }}
      >
        <AlertTriangle
          className="w-4 h-4"
          style={{ color: "hsl(36 80% 42%)" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "hsl(22 25% 20%)" }}
        >
          {lowCount} produit{lowCount !== 1 ? "s" : ""} en rupture ou stock
          critique
        </p>
        <p className="text-xs text-muted-foreground">
          Vérifiez votre stock pour maintenir vos ventes
        </p>
      </div>
      <Link
        to="/stock"
        className="ml-auto text-xs font-semibold shrink-0 hover:underline"
        style={{ color: "hsl(22 72% 48%)" }}
      >
        Voir le stock →
      </Link>
    </div>
  );
}

// ─── Gradient CTA button ──────────────────────────────────────────────────────

function GradientButton({
  onClick,
  children,
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-2", className)}
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
        boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
        color: "white",
        borderRadius: "12px",
        padding: "0.625rem 1.25rem",
        fontWeight: "700",
        fontSize: "0.875rem",
        letterSpacing: "0.025em",
        transition: "all 0.2s",
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px) scale(1.02)";
        e.currentTarget.style.boxShadow =
          "0 6px 20px hsl(22 72% 48% / 0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow =
          "0 4px 14px hsl(22 72% 48% / 0.35)";
      }}
    >
      {/* Shine overlay */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.12) 60%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {children}
    </button>
  );
}

// ─── Vendeur Activity Section ────────────────────────────────────────────────

function VendeurActivitySection() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['vendeur-summary', 'today'],
    queryFn: () => activityService.getVendeurSummary('today'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
  </div>;

  if (!summary?.length) return (
    <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13, padding: '24px 0' }}>
      Aucune activité vendeur aujourd'hui
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 8 }}>
      {summary.map(v => (
        <div key={v.user_id} style={{
          background: 'hsl(var(--card))',
          borderRadius: 16,
          padding: '16px 20px',
          border: '1px solid hsl(var(--border))',
          boxShadow: 'var(--shadow-warm-sm, 0 1px 4px hsl(0 0% 0% / 0.06))',
        }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 15,
            }}>
              {(v.full_name || v.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'hsl(var(--foreground))' }}>{v.full_name || v.username}</div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 1 }}>
                {v.last_action_at ? new Date(v.last_action_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Inactif'}
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>Ventes</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'hsl(22 72% 48%)', fontFamily: 'var(--font-amount, Fraunces, serif)' }}>{v.sales_count}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>Chiffre</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{(v.total_revenue || 0).toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}>Actions</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'hsl(152 38% 38%)' }}>{v.action_count}</div>
            </div>
          </div>
          {/* Last action */}
          {v.last_action && (
            <div style={{
              marginTop: 10, fontSize: 11, color: 'hsl(var(--muted-foreground))',
              background: 'hsl(var(--muted) / 0.5)', borderRadius: 8, padding: '5px 10px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {v.last_action}
            </div>
          )}
        </div>
      ))}
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
  const maxTopSold =
    topProducts.length > 0
      ? Math.max(...topProducts.map((p) => p.total_sold))
      : 0;

  const rankTints = [
    "bg-primary",
    "bg-accent",
    "bg-warning",
    "bg-[hsl(var(--badge-blue))]",
  ];

  const today = new Date();

  return (
    <>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Page header premium ── */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 flex-wrap">
            <div>
              {/* Badge Admin + Date */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
                  style={{
                    background: "hsl(22 72% 48% / 0.1)",
                    color: "hsl(22 72% 48%)",
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatLongDate(today)}</span>
                  <span className="text-muted-foreground/40 mx-0.5">·</span>
                  <span>Libreville, Gabon</span>
                </span>
              </div>

              {/* Grand titre avec accent bar */}
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="shrink-0"
                  style={{
                    width: "3px",
                    height: "28px",
                    borderRadius: "2px",
                    background:
                      "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
                  }}
                />
                <h1
                  className="text-2xl md:text-[1.85rem] font-extrabold text-foreground"
                  style={{ letterSpacing: "-0.028em" }}
                >
                  Bonjour, voici votre activité
                </h1>
              </div>
              <p className="text-sm text-muted-foreground ml-4 mt-1">
                Suivi en temps réel des ventes, du stock et de votre boutique.
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/statistics"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border bg-card text-sm font-semibold hover:bg-secondary/60 transition-colors"
              >
                <BarChart2 className="w-4 h-4" />
                Statistiques
              </Link>
              <button
                onClick={() => navigate("/reports")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border bg-card text-sm font-semibold hover:bg-secondary/60 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Rapports
              </button>
              <GradientButton onClick={() => navigate("/pos")}>
                <ShoppingCart className="w-4 h-4" />
                Accéder à la caisse
                <ArrowRight className="w-4 h-4" />
              </GradientButton>
            </div>
          </div>
        </div>

        {/* ── Bandeau alerte stock ── */}
        {!isLoading && lowCount > 0 && (
          <StockAlertBanner lowCount={lowCount} />
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
                trend={
                  todayCount > 0
                    ? { direction: "up", label: "Actif" }
                    : { direction: "neutral", label: "Inactif" }
                }
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
                delay={60}
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
                delay={120}
              />
              <PremiumKpi
                label="Clients"
                value={totalClients}
                suffix=""
                duration={800}
                hint={
                  lowCount > 0
                    ? `${lowCount} produit${lowCount !== 1 ? "s" : ""} en stock bas`
                    : "Stock OK"
                }
                icon={Users}
                tint={lowCount > 0 ? "warning" : "accent"}
                delay={180}
                trend={
                  lowCount > 0
                    ? {
                        direction: "down",
                        label: `${lowCount} alerte${lowCount !== 1 ? "s" : ""}`,
                      }
                    : { direction: "up", label: "OK" }
                }
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
              animDelay={420}
              right={
                <button
                  onClick={() => navigate("/invoices")}
                  className="text-xs font-semibold hover:underline shrink-0"
                  style={{ color: "hsl(22 72% 48%)" }}
                >
                  Voir tout →
                </button>
              }
            />
            <div
              className="bg-card rounded-2xl border overflow-hidden"
              style={{
                boxShadow:
                  "0 2px 8px hsl(22 30% 15% / 0.05), 0 8px 24px hsl(22 30% 15% / 0.03)",
              }}
            >
              {isLoading ? (
                <TableSkeleton rows={5} />
              ) : recentSales.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="inline-flex w-12 h-12 rounded-full bg-muted items-center justify-center mb-3">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold">
                    Aucune vente pour le moment
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les ventes enregistrées apparaîtront ici.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y">
                    {recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-4 flex items-start justify-between gap-3 transition-colors cursor-pointer"
                        style={{ ["--hover-bg" as string]: "hsl(22 72% 48% / 0.04)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "hsl(22 72% 48% / 0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        onClick={() => navigate("/invoices")}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: "hsl(22 72% 48% / 0.1)",
                            }}
                          >
                            <ShoppingBag
                              className="w-4 h-4"
                              style={{ color: "hsl(22 72% 48%)" }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {sale.invoice_number ?? `VNT-${sale.id}`}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {formatDate(sale.created_at)} ·{" "}
                              {sale.items.length} article
                              {sale.items.length !== 1 ? "s" : ""}
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

                  {/* Desktop table */}
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
                          <tr
                            key={sale.id}
                            className="hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => navigate("/invoices")}
                          >
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="font-semibold">
                                  {sale.invoice_number ?? `VNT-${sale.id}`}
                                </span>
                              </div>
                            </td>
                            <td className="text-muted-foreground">
                              {formatDate(sale.created_at)}
                            </td>
                            <td className="tabular-nums">
                              {sale.items.length}
                            </td>
                            <td className="font-semibold tabular-nums text-right">
                              {formatFcfa(sale.total_amount)}
                            </td>
                            <td>
                              <StatusBadge label="Terminée" variant="success" />
                            </td>
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
                animDelay={420}
                right={
                  !isLoading && lowCount > 0 ? (
                    <span
                      className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold"
                      style={{
                        background: "hsl(4 72% 52%)",
                        color: "white",
                      }}
                    >
                      {lowCount}
                    </span>
                  ) : null
                }
              />
              <div
                className="rounded-2xl border bg-card overflow-hidden"
                style={{
                  borderColor:
                    !isLoading && lowCount > 0
                      ? "hsl(36 88% 52% / 0.4)"
                      : undefined,
                  boxShadow:
                    !isLoading && lowCount > 0
                      ? "0 2px 12px hsl(36 88% 52% / 0.1)"
                      : "0 2px 8px hsl(22 30% 15% / 0.05)",
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
                    <div className="inline-flex w-12 h-12 rounded-full bg-muted items-center justify-center mb-2">
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
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "hsl(36 88% 52% / 0.15)" }}
                      >
                        <AlertTriangle
                          className="w-5 h-5"
                          style={{ color: "hsl(36 80% 42%)" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          <span style={{ color: "hsl(4 72% 52%)" }}>
                            {lowCount}
                          </span>{" "}
                          produit{lowCount !== 1 ? "s" : ""} sous le seuil
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vérifiez et réapprovisionnez pour éviter les ruptures.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/stock")}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all active:scale-[0.98]"
                      style={{
                        color: "hsl(22 72% 48%)",
                        border: "1px solid hsl(22 72% 48% / 0.3)",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "hsl(22 72% 48% / 0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
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
                animDelay={620}
                right={<Trophy className="w-4 h-4 text-warning shrink-0" />}
              />
              <div
                className="rounded-2xl border bg-card overflow-hidden"
                style={{
                  boxShadow:
                    "0 2px 8px hsl(22 30% 15% / 0.05), 0 8px 24px hsl(22 30% 15% / 0.03)",
                }}
              >
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded" />
                    ))}
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="inline-flex w-12 h-12 rounded-full bg-muted items-center justify-center mb-2">
                      <Trophy className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold">
                      Pas encore de classement
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les ventes alimenteront le top produits.
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {topProducts.slice(0, 5).map((p, i) => {
                      const barTint = rankTints[i % rankTints.length];
                      const pct =
                        maxTopSold > 0
                          ? Math.max(8, (p.total_sold / maxTopSold) * 100)
                          : 0;
                      return (
                        <div
                          key={p.product__name}
                          className="group relative p-3 rounded-xl transition-colors cursor-pointer"
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "hsl(22 72% 48% / 0.04)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold shrink-0",
                                i === 0 && "bg-primary text-primary-foreground",
                                i === 1 && "bg-accent text-accent-foreground",
                                i === 2 &&
                                  "bg-warning text-[hsl(var(--warning-foreground))]",
                                i > 2 && "bg-muted text-muted-foreground"
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
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    barTint
                                  )}
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
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    style={{ color: "hsl(22 72% 48%)" }}
                  >
                    Voir les rapports détaillés
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Activité vendeurs ── */}
        <section style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: 'hsl(22 72% 48%)' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'hsl(var(--foreground))' }}>Activité vendeurs — aujourd'hui</h2>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginLeft: 'auto' }}>Rafraîchit toutes les 60s</span>
          </div>
          <VendeurActivitySection />
        </section>

      </div>
    </>
  );
}
