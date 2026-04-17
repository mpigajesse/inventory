import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { statisticsService } from "@/services/statisticsService";
import type { StatPeriod, Granularity, SalesPeriodData } from "@/services/statisticsService";
import { TrendingUp, ShoppingCart, CalendarDays, BarChart2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFcfa(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function formatFcfaFull(v: number): string {
  return v.toLocaleString("fr-FR") + " FCFA";
}

function formatDateLabel(period: string, granularity: Granularity): string {
  if (!period) return period;

  if (granularity === "hour") {
    // "2024-01-17T14:00:00" → "14h"
    const match = period.match(/T(\d{2}):/);
    return match ? `${match[1]}h` : period;
  }

  if (granularity === "day") {
    // "2024-01-17" → "17/01"
    const parts = period.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  }

  if (granularity === "week") {
    // "2024-W03" or ISO week → keep as-is or shorten
    const match = period.match(/W(\d+)/);
    return match ? `S${match[1]}` : period;
  }

  if (granularity === "month") {
    // "2024-01" → "Jan"
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const parts = period.split("-");
    if (parts.length === 2) {
      const m = parseInt(parts[1], 10) - 1;
      return months[m] ?? period;
    }
  }

  return period;
}

function formatPeakDay(raw: string | null): string {
  if (!raw) return "—";
  const parts = raw.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return raw;
}

// ─── Granularity pill selector ────────────────────────────────────────────────

const GRANULARITY_OPTIONS: { value: Granularity; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "hour",  label: "Heure",    icon: Clock },
  { value: "day",   label: "Jour",     icon: CalendarDays },
  { value: "week",  label: "Semaine",  icon: BarChart2 },
  { value: "month", label: "Mois",     icon: TrendingUp },
];

interface GranularitySelectorProps {
  value: Granularity;
  onChange: (g: Granularity) => void;
}

function GranularitySelector({ value, onChange }: GranularitySelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border">
      {GRANULARITY_OPTIONS.map(({ value: g, label, icon: Icon }) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
            value === g
              ? "bg-card shadow-sm text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  granularity: Granularity;
}

function CustomTooltip({ active, payload, label, granularity }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((p) => p.name === "revenue")?.value ?? 0;
  const transactions = payload.find((p) => p.name === "transactions")?.value ?? 0;

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm min-w-[160px]"
      style={{
        background: "hsl(20 25% 10%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {formatDateLabel(label ?? "", granularity)}
      </p>
      <p style={{ color: "white", fontSize: "15px", fontWeight: "700", fontFamily: "Fraunces, Georgia, serif", letterSpacing: "-0.01em" }}>
        {formatFcfaFull(revenue)}
      </p>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", marginTop: "2px" }}>
        {transactions} vente{transactions !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  totalRevenue: number;
  totalTransactions: number;
  peakDay: string | null;
  isLoading: boolean;
}

function SummaryCards({ totalRevenue, totalTransactions, peakDay, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total revenus",
      value: formatFcfaFull(totalRevenue),
      icon: TrendingUp,
      iconFrom: "hsl(22, 72%, 48%)",
      iconTo: "hsl(36, 88%, 52%)",
      iconShadow: "hsl(22 72% 48% / 0.28)",
      isMoney: true,
    },
    {
      label: "Transactions",
      value: String(totalTransactions),
      icon: ShoppingCart,
      iconFrom: "hsl(152, 38%, 38%)",
      iconTo: "hsl(160, 48%, 46%)",
      iconShadow: "hsl(152 38% 38% / 0.28)",
      isMoney: false,
    },
    {
      label: "Jour pic",
      value: formatPeakDay(peakDay),
      icon: CalendarDays,
      iconFrom: "hsl(36, 88%, 48%)",
      iconTo: "hsl(22, 72%, 52%)",
      iconShadow: "hsl(36 88% 48% / 0.28)",
      isMoney: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, iconFrom, iconTo, iconShadow, isMoney }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-4 -right-4 w-16 h-16 rounded-full"
            style={{ background: `radial-gradient(circle, ${iconFrom.replace(")", " / 0.1)")} 0%, transparent 70%)` }}
          />
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${iconFrom}, ${iconTo})`,
              boxShadow: `0 4px 12px ${iconShadow}`,
            }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground mb-0.5">
              {label}
            </p>
            {isLoading ? (
              <div className="h-5 w-28 rounded skeleton-shimmer" />
            ) : (
              <p
                className="text-base font-bold tabular-nums truncate"
                style={isMoney ? { fontFamily: "Fraunces, Georgia, serif", letterSpacing: "-0.02em" } : {}}
              >
                {value}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-64 skeleton-shimmer rounded-xl" />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SalesChartProps {
  period: StatPeriod;
}

export function SalesChart({ period }: SalesChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("day");

  const { data, isLoading } = useQuery({
    queryKey: ["stats-sales", period, granularity],
    queryFn: () => statisticsService.getSales({ granularity }),
  });

  const chartData: SalesPeriodData[] = data?.data ?? [];

  // Formatted data for recharts — add a `label` field for X axis
  const formatted = chartData.map((d) => ({
    ...d,
    label: formatDateLabel(d.period, granularity),
  }));

  const summary = data?.summary ?? {
    total_revenue: 0,
    total_transactions: 0,
    avg_basket: 0,
    peak_day: null,
  };

  return (
    <div className="space-y-6">

      {/* ── Summary cards ── */}
      <SummaryCards
        totalRevenue={summary.total_revenue}
        totalTransactions={summary.total_transactions}
        peakDay={summary.peak_day}
        isLoading={isLoading}
      />

      {/* ── Section: Revenue line chart ── */}
      <div
        className="rounded-2xl border bg-card p-6"
        style={{ boxShadow: "0 2px 12px hsl(22 72% 48% / 0.05)" }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(22, 72%, 48%), hsl(36, 88%, 52%))",
                boxShadow: "0 4px 12px hsl(22 72% 48% / 0.28)",
              }}
            >
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-heading">Revenus</h2>
              <p className="text-xs text-muted-foreground">Évolution sur la période</p>
            </div>
          </div>
          <GranularitySelector value={granularity} onChange={setGranularity} />
        </div>

        {/* Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : formatted.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <TrendingUp className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune donnée sur cette période</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(22, 72%, 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(22, 72%, 48%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(28 18% 88% / 0.7)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(25 12% 48%)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatFcfa}
                tick={{ fontSize: 11, fill: "hsl(25 12% 48%)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                content={<CustomTooltip granularity={granularity} />}
                cursor={{ stroke: "hsl(22 72% 48% / 0.2)", strokeWidth: 1.5 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (value === "revenue" ? "Revenus (FCFA)" : value)}
                wrapperStyle={{ fontSize: 11, color: "hsl(25 12% 48%)" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="hsl(22, 72%, 48%)"
                strokeWidth={2.5}
                fill="url(#gradRevenue)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(22, 72%, 48%)", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section: Transactions bar chart ── */}
      <div
        className="rounded-2xl border bg-card p-6"
        style={{ boxShadow: "0 2px 12px hsl(22 72% 48% / 0.05)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(152, 38%, 38%), hsl(160, 48%, 46%))",
              boxShadow: "0 4px 12px hsl(152 38% 38% / 0.28)",
            }}
          >
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-heading">Transactions</h2>
            <p className="text-xs text-muted-foreground">Nombre de ventes par période</p>
          </div>
        </div>

        {/* Chart */}
        {isLoading ? (
          <ChartSkeleton />
        ) : formatted.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ShoppingCart className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune donnée sur cette période</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(28 18% 88% / 0.7)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(25 12% 48%)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(25 12% 48%)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={<CustomTooltip granularity={granularity} />}
                cursor={{ fill: "hsl(22 72% 48% / 0.06)" }}
              />
              <Legend
                iconType="square"
                iconSize={10}
                formatter={(value) => (value === "transactions" ? "Transactions" : value)}
                wrapperStyle={{ fontSize: 11, color: "hsl(25 12% 48%)" }}
              />
              <Bar
                dataKey="transactions"
                name="transactions"
                fill="hsl(22, 72%, 48%)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
