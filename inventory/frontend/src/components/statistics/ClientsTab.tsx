import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import { statisticsService } from "@/services/statisticsService";
import type { StatPeriod } from "@/services/statisticsService";
import { Users, UserCheck, CreditCard, Loader2, TrendingUp } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return String(amount);
}

function formatFcfaFull(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

// ─── Tooltip personnalisé ──────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomLineTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-xs shadow-lg"
      style={{
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        color: "hsl(var(--popover-foreground))",
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name} : {item.value}
        </p>
      ))}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-xs shadow-lg"
      style={{
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        color: "hsl(var(--popover-foreground))",
      }}
    >
      <p className="font-semibold truncate max-w-[160px] mb-1">{label}</p>
      <p className="text-warning font-semibold">{formatFcfaFull(value)}</p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ClientsTabProps {
  period: StatPeriod;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function ClientsTab({ period }: ClientsTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["statistics", "clients", period],
    queryFn: () => statisticsService.getClients({ period }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Chargement des données clients…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <TrendingUp className="w-8 h-8 opacity-25" />
        <p className="text-sm">Impossible de charger les données clients.</p>
      </div>
    );
  }

  const topClients = data.top_clients.slice(0, 10);
  const byPeriod = data.by_period ?? [];

  return (
    <div className="space-y-6">

      {/* ── Section 1 : Métriques clés ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nouveaux clients"
          value={String(data.new_clients_this_period)}
          icon={Users}
          change="Sur la période sélectionnée"
          changeType="neutral"
        />
        <StatCard
          label="Clients fidèles (≥2 achats)"
          value={String(data.returning_clients)}
          icon={UserCheck}
          change="Ont acheté plusieurs fois"
          changeType="positive"
        />
        <StatCard
          label="Clients avec crédit"
          value={String(data.clients_with_credit.count)}
          icon={CreditCard}
          change="Crédit en cours"
          changeType={data.clients_with_credit.count > 0 ? "negative" : "neutral"}
        />
        <StatCard
          label="Total crédit en cours"
          value={formatFcfaFull(data.clients_with_credit.total_credit)}
          icon={CreditCard}
          change="Montant total dû"
          changeType={data.clients_with_credit.total_credit > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* ── Section 2 : Top 10 clients ── */}
      <div className="card-premium p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h2 className="text-sm font-semibold font-heading">Top 10 clients</h2>
            <p className="text-xs text-muted-foreground">Classés par montant dépensé</p>
          </div>
        </div>

        {topClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Users className="w-8 h-8 opacity-25" />
            <p className="text-sm">Aucune donnée disponible</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={topClients.length * 44 + 40}>
            <BarChart
              layout="vertical"
              data={topClients}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tickFormatter={formatFcfa}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="client_name"
                width={120}
                tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
              <Bar
                dataKey="total_spent"
                fill="hsl(var(--warning))"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section 3 : Évolution clients ── */}
      {byPeriod.length > 0 && (
        <div className="card-premium p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-heading">Évolution clients</h2>
              <p className="text-xs text-muted-foreground">Nouveaux et actifs sur la période</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={byPeriod}
              margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="new_clients"
                name="Nouveaux clients"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="active_clients"
                name="Clients actifs"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--accent))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
