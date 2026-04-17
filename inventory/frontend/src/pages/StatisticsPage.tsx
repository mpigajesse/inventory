import React, { useState } from "react";
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

const TINT_MAP: Record<KpiTint, { bg: string; fg: string; ring: string; grad: string }> = {
  primary:     { bg: "bg-primary/12",                  fg: "text-primary",                  ring: "ring-primary/20",     grad: "from-primary/[0.06] via-transparent" },
  accent:      { bg: "bg-accent/12",                   fg: "text-accent",                   ring: "ring-accent/20",      grad: "from-accent/[0.06] via-transparent" },
  warning:     { bg: "bg-warning/15",                  fg: "text-warning",                  ring: "ring-warning/25",     grad: "from-warning/[0.07] via-transparent" },
  info:        { bg: "bg-[hsl(var(--badge-blue))]/12", fg: "text-[hsl(var(--badge-blue))]", ring: "ring-[hsl(var(--badge-blue))]/20", grad: "from-[hsl(var(--badge-blue))]/[0.06] via-transparent" },
  destructive: { bg: "bg-destructive/10",              fg: "text-destructive",              ring: "ring-destructive/20", grad: "from-destructive/[0.05] via-transparent" },
  success:     { bg: "bg-success/10",                  fg: "text-success",                  ring: "ring-success/20",     grad: "from-success/[0.05] via-transparent" },
};

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  changePct?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  tint: KpiTint;
  delay?: number;
}

function KpiCard({ label, value, hint, changePct, icon: Icon, tint, delay = 0 }: KpiCardProps) {
  const t = TINT_MAP[tint];
  const isUp = changePct !== null && changePct !== undefined && changePct > 0;
  const isDown = changePct !== null && changePct !== undefined && changePct < 0;
  const hasChange = changePct !== null && changePct !== undefined;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5",
        "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 focus-within:ring-2",
        t.ring
      )}
      style={{
        animation: "fadeScale 0.35s cubic-bezier(0.16,1,0.3,1) both",
        animationDelay: `${delay}ms`,
        boxShadow: "0 1px 2px hsl(20 25% 12% / 0.04), 0 2px 12px hsl(22 72% 48% / 0.04)",
      }}
    >
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-70", t.grad)} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground leading-tight">{label}</p>
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", t.bg)}>
            <Icon className={cn("w-4 h-4", t.fg)} />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
          {hasChange && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
              isUp && "bg-success/12 text-success",
              isDown && "bg-destructive/12 text-destructive",
              !isUp && !isDown && "bg-muted text-muted-foreground"
            )}>
              {isUp && <TrendingUp className="w-3 h-3" />}
              {isDown && <TrendingDown className="w-3 h-3" />}
              {pctLabel(changePct)}
            </span>
          )}
        </div>
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
      <KpiCard label="Revenus"           value={data ? fmt(data.revenue.current) : "—"}       hint={`Période préc. : ${data ? fmt(data.revenue.previous) : "—"}`}           changePct={data?.revenue.change_pct}      icon={DollarSign}     tint="primary"   delay={0}   />
      <KpiCard label="Transactions"      value={data ? `${data.transactions.current}` : "—"}  hint={`Période préc. : ${data?.transactions.previous ?? "—"} txns`}             changePct={data?.transactions.change_pct} icon={ShoppingCart}   tint="accent"    delay={50}  />
      <KpiCard label="Panier moyen"      value={data ? fmt(data.avg_basket.current) : "—"}    hint={`Période préc. : ${data ? fmt(data.avg_basket.previous) : "—"}`}           changePct={data?.avg_basket.change_pct}   icon={ShoppingBag}    tint="info"      delay={100} />
      <KpiCard label="Nouveaux clients"  value={data ? `${data.new_clients.current}` : "—"}   hint={`Période préc. : ${data?.new_clients.previous ?? "—"}`}                    changePct={data?.new_clients.change_pct}  icon={UserCheck}      tint="accent"    delay={150} />
      <KpiCard label="Alertes stock"     value={data ? `${data.stock_alerts.low} bas · ${data.stock_alerts.critical} critique` : "—"} hint={hasCrit ? "Rupture imminente" : hasLow ? "Réapprovisionnement recommandé" : "Stock en bonne santé"} icon={AlertTriangle} tint={alertTint} delay={200} />
      <KpiCard label="Paiement dominant" value={topPayLabel}                                   hint="Mode le plus utilisé sur la période"                                       icon={CreditCard}     tint="primary"   delay={250} />
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
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border">
      {PERIOD_OPTIONS.map(({ value: p, label }) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            value === p
              ? "bg-card shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          )}
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
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-0 mb-6 -mb-px">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px whitespace-nowrap shrink-0",
            active === id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
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

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewStats>({
    queryKey: ["stats-overview", period],
    queryFn: () => statisticsService.getOverview(period),
    refetchInterval: 60_000,
  });

  return (
    <>
      <Topbar
        title="Statistiques & Analytics"
        subtitle="Performance commerciale, stock et tendances"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in space-y-6">

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
        <TabNav active={activeTab} onChange={setActiveTab} />

        {/* ── Contenu de l'onglet actif ── */}
        {activeTab === "ventes"    && <SalesChart period={period} />}
        {activeTab === "produits"  && <ProductsTab period={period} />}
        {activeTab === "stock"     && <StockTab />}
        {activeTab === "clients"   && <ClientsTab period={period} />}
        {activeTab === "caissiers" && <CashiersTab period={period} />}
        {activeTab === "paiements" && <PaymentTab period={period} />}

      </div>
    </>
  );
}
