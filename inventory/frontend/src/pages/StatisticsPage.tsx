import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { SalesChart } from "@/components/statistics/SalesCharts";
import { ProductsTab } from "@/components/statistics/ProductsTab";
import { StockTab } from "@/components/statistics/StockTab";
import { ClientsTab } from "@/components/statistics/ClientsTab";
import { CashiersTab } from "@/components/statistics/CashiersTab";
import { PaymentTab } from "@/components/statistics/PaymentTab";
import { Skeleton } from "@/components/ui/skeleton";
import {
  statisticsService,
  type StatPeriod,
  type OverviewStats,
} from "@/services/statisticsService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import {
  CalendarDays,
  ShoppingCart,
  Package,
  Layers,
  Users,
  UserCog,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M FCFA";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k FCFA";
  return n.toLocaleString("fr-FR") + " FCFA";
}

function pctLabel(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

type KpiTint = "primary" | "accent" | "warning" | "info" | "destructive" | "success";

const TINT_ICON_GRADIENT: Record<KpiTint, { from: string; to: string; shadow: string }> = {
  primary:     { from: "hsl(22, 72%, 48%)",  to: "hsl(36, 88%, 52%)",  shadow: "hsl(22 72% 48% / 0.28)" },
  accent:      { from: "hsl(152, 38%, 38%)", to: "hsl(160, 48%, 46%)", shadow: "hsl(152 38% 38% / 0.28)" },
  warning:     { from: "hsl(36, 88%, 48%)",  to: "hsl(22, 72%, 52%)",  shadow: "hsl(36 88% 48% / 0.28)" },
  info:        { from: "hsl(210, 70%, 52%)", to: "hsl(220, 65%, 60%)", shadow: "hsl(210 70% 52% / 0.28)" },
  destructive: { from: "hsl(4, 72%, 52%)",   to: "hsl(15, 78%, 58%)",  shadow: "hsl(4 72% 52% / 0.28)"  },
  success:     { from: "hsl(152, 38%, 38%)", to: "hsl(160, 48%, 50%)", shadow: "hsl(152 38% 38% / 0.28)" },
};

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  changePct?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  tint: KpiTint;
  isMoney?: boolean;
  delay?: number;
  isVisible?: boolean;
}

function KpiCard({ label, value, hint, changePct, icon: Icon, tint, isMoney = false, delay = 0, isVisible = true }: KpiCardProps) {
  const g = TINT_ICON_GRADIENT[tint];
  const isUp = changePct !== null && changePct !== undefined && changePct > 0;
  const isDown = changePct !== null && changePct !== undefined && changePct < 0;
  const hasChange = changePct !== null && changePct !== undefined;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 hover:-translate-y-0.5"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 0.35s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.35s cubic-bezier(0.16,1,0.3,1) ${delay}ms, box-shadow 0.3s ease`,
      }}
    >
      {/* Decorative orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-4 -right-4 w-20 h-20 rounded-full"
        style={{ background: `radial-gradient(circle, ${g.from.replace(")", " / 0.1)")} 0%, transparent 70%)` }}
      />

      <div className="relative">
        {/* Icon */}
        <div
          className="w-10 h-10 flex items-center justify-center mb-3 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
            boxShadow: `0 4px 12px ${g.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
            borderRadius: "14px",
          }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>

        {/* Value */}
        <p
          className="text-2xl font-bold tracking-tight tabular-nums text-foreground mb-0.5"
          style={isMoney ? { fontFamily: "Fraunces, Georgia, serif", letterSpacing: "-0.02em" } : {}}
        >
          {value}
        </p>

        {/* Trend badge */}
        {hasChange && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: isUp ? "hsl(152 38% 38% / 0.1)" : isDown ? "hsl(4 72% 52% / 0.1)" : "hsl(var(--muted))",
                color: isUp ? "hsl(152 38% 38%)" : isDown ? "hsl(4 72% 52%)" : "hsl(var(--muted-foreground))",
              }}
            >
              {isUp && <TrendingUp className="w-3 h-3" />}
              {isDown && <TrendingDown className="w-3 h-3" />}
              {pctLabel(changePct)}
            </span>
            <span className="text-xs text-muted-foreground">vs période préc.</span>
          </div>
        )}

        {/* Label + hint */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-2 leading-tight">
          {label}
        </p>
        {hint && <p className="text-xs text-muted-foreground truncate mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// ─── Overview KPI Grid ────────────────────────────────────────────────────────

function OverviewKpiGrid({ data, isLoading }: { data: OverviewStats | undefined; isLoading: boolean }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Trigger on next tick so the DOM has painted with opacity:0 first
      const id = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsVisible(false);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
    );
  }

  const topPay = data?.top_payment_method ?? "—";
  const topPayLabel = topPay === "cash" ? "Espèces" : topPay === "mobile_money" ? "Mobile Money" : topPay === "card" ? "Carte" : topPay === "credit" ? "Crédit" : topPay;

  const hasCrit = (data?.stock_alerts.critical ?? 0) > 0;
  const hasLow  = (data?.stock_alerts.low ?? 0) > 0;
  const alertTint: KpiTint = hasCrit ? "destructive" : hasLow ? "warning" : "success";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <KpiCard label="Revenus"           value={data ? fmt(data.revenue.current) : "—"}       hint={`Période préc. : ${data ? fmt(data.revenue.previous) : "—"}`}           changePct={data?.revenue.change_pct}      icon={DollarSign}     tint="primary"     isMoney  delay={0}   isVisible={isVisible} />
      <KpiCard label="Transactions"      value={data ? `${data.transactions.current}` : "—"}  hint={`Période préc. : ${data?.transactions.previous ?? "—"} txns`}             changePct={data?.transactions.change_pct} icon={ShoppingCart}   tint="accent"              delay={70}  isVisible={isVisible} />
      <KpiCard label="Panier moyen"      value={data ? fmt(data.avg_basket.current) : "—"}    hint={`Période préc. : ${data ? fmt(data.avg_basket.previous) : "—"}`}           changePct={data?.avg_basket.change_pct}   icon={ShoppingBag}    tint="info"        isMoney  delay={140} isVisible={isVisible} />
      <KpiCard label="Nouveaux clients"  value={data ? `${data.new_clients.current}` : "—"}   hint={`Période préc. : ${data?.new_clients.previous ?? "—"}`}                    changePct={data?.new_clients.change_pct}  icon={UserCheck}      tint="accent"              delay={210} isVisible={isVisible} />
      <KpiCard label="Alertes stock"     value={data ? `${data.stock_alerts.low} bas · ${data.stock_alerts.critical} critique` : "—"} hint={hasCrit ? "Rupture imminente" : hasLow ? "Réapprovisionnement recommandé" : "Stock en bonne santé"} icon={AlertTriangle} tint={alertTint} delay={280} isVisible={isVisible} />
      <KpiCard label="Paiement dominant" value={topPayLabel}                                   hint="Mode le plus utilisé sur la période"                                       icon={CreditCard}     tint="primary"             delay={350} isVisible={isVisible} />
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { value: StatPeriod; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "week",  label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year",  label: "Année" },
];

interface PeriodSelectorProps {
  value: StatPeriod;
  onChange: (p: StatPeriod) => void;
}

function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/60 border border-border" style={{ borderRadius: "100px" }}>
      {PERIOD_OPTIONS.map(({ value: p, label }) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "px-3.5 py-1.5 text-xs font-semibold",
          )}
          style={{
            borderRadius: "100px",
            transition: "background 0.25s cubic-bezier(0.16,1,0.3,1), color 0.2s ease, box-shadow 0.25s ease",
            ...(value === p
              ? {
                  background: "hsl(22 72% 48% / 0.15)",
                  color: "hsl(22 72% 48%)",
                  boxShadow: "0 1px 4px hsl(22 72% 48% / 0.15)",
                }
              : {
                  background: "transparent",
                  color: "hsl(var(--muted-foreground))",
                }),
          }}
          onMouseEnter={(e) => {
            if (value !== p) {
              (e.currentTarget as HTMLButtonElement).style.background = "hsl(22 72% 48% / 0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--foreground))";
            }
          }}
          onMouseLeave={(e) => {
            if (value !== p) {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "ventes" | "produits" | "stock" | "clients" | "caissiers" | "paiements";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "ventes",     label: "Ventes",     icon: ShoppingCart },
  { id: "produits",   label: "Produits",   icon: Package },
  { id: "stock",      label: "Stock",      icon: Layers },
  { id: "clients",    label: "Clients",    icon: Users },
  { id: "caissiers",  label: "Caissiers",  icon: UserCog },
  { id: "paiements",  label: "Paiements",  icon: CreditCard },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div
      className="flex items-center gap-1 p-1 overflow-x-auto mb-6"
      style={{
        background: "hsl(var(--muted))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "14px",
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold whitespace-nowrap shrink-0"
          style={{
            borderRadius: "10px",
            transition: "background 0.25s cubic-bezier(0.16,1,0.3,1), color 0.2s ease, box-shadow 0.25s ease",
            ...(active === id
              ? {
                  background: "linear-gradient(135deg, hsl(22, 72%, 48%), hsl(36, 88%, 52%))",
                  color: "white",
                  boxShadow: "0 4px 12px hsl(22 72% 48% / 0.3)",
                }
              : {
                  background: "transparent",
                  color: "hsl(var(--muted-foreground))",
                }),
          }}
          onMouseEnter={(e) => {
            if (active !== id) {
              (e.currentTarget as HTMLButtonElement).style.background = "hsl(22 72% 48% / 0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--foreground))";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== id) {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
            }
          }}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  // All hooks before any conditional rendering
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [period, setPeriod] = useState<StatPeriod>("week");
  const [activeTab, setActiveTab] = useState<TabId>("ventes");
  const [displayedTab, setDisplayedTab] = useState<TabId>("ventes");
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const tabTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewStats>({
    queryKey: ["stats-overview", period],
    queryFn: () => statisticsService.getOverview(period),
    refetchInterval: 60_000,
  });

  function handleTabChange(tab: TabId) {
    if (tab === activeTab) return;
    if (tabTransitionRef.current) clearTimeout(tabTransitionRef.current);
    setActiveTab(tab);
    setIsTabTransitioning(true);
    tabTransitionRef.current = setTimeout(() => {
      setDisplayedTab(tab);
      setIsTabTransitioning(false);
    }, 150);
  }

  useEffect(() => {
    return () => {
      if (tabTransitionRef.current) clearTimeout(tabTransitionRef.current);
    };
  }, []);

  return (
    <>
      <Topbar
        title="Statistiques & Analytics"
        subtitle="Performance commerciale, stock et tendances"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in space-y-6">
        {/* ── Float keyframes ── */}
        <style>{`
          @keyframes stats-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>

        {/* ── Decorative background orbs ── */}
        <div aria-hidden className="pointer-events-none fixed top-16 right-8 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, hsl(22 72% 48% / 0.07) 0%, transparent 68%)", animation: "stats-float 6s ease-in-out infinite", zIndex: -1 }} />
        <div aria-hidden className="pointer-events-none fixed bottom-24 left-12 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, hsl(152 38% 38% / 0.05) 0%, transparent 68%)", animation: "stats-float 6s ease-in-out infinite 3s", zIndex: -1 }} />

        {/* ── Premium page header ── */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-7 rounded-full shrink-0"
              style={{ background: "linear-gradient(to bottom, hsl(22, 72%, 48%), hsl(152, 38%, 38%))" }}
            />
            <h1
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "var(--font-heading, inherit)", letterSpacing: "-0.025em" }}
            >
              Statistiques &amp; Analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-3">Vue d'ensemble des performances du magasin</p>
        </div>

        {/* ── Period selector + real-time badge ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[11px] font-semibold text-success">Données en temps réel</span>
          </div>
        </div>

        {/* ── 6 KPI Cards ── */}
        <OverviewKpiGrid data={overview} isLoading={overviewLoading} />

        {/* ── Navigation par onglets ── */}
        <TabNav active={activeTab} onChange={handleTabChange} />

        {/* ── Contenu de l'onglet actif (avec transition) ── */}
        <div
          style={{
            transition: "opacity 0.15s ease, transform 0.15s ease",
            opacity: isTabTransitioning ? 0 : 1,
            transform: isTabTransitioning ? "translateY(6px)" : "none",
          }}
        >
          {displayedTab === "ventes"    && <SalesChart period={period} />}
          {displayedTab === "produits"  && <ProductsTab period={period} />}
          {displayedTab === "stock"     && <StockTab />}
          {displayedTab === "clients"   && <ClientsTab period={period} />}
          {displayedTab === "caissiers" && <CashiersTab period={period} />}
          {displayedTab === "paiements" && <PaymentTab period={period} />}
        </div>

      </div>
    </>
  );
}
