import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
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
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: "hsl(20 25% 10%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }} className="truncate max-w-[160px]">{label}</p>
      <p style={{ color: "white", fontWeight: "700", fontFamily: "Fraunces, Georgia, serif", fontSize: "14px" }}>{formatFcfaFull(value)}</p>
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

  // Entrance animation state
  const [kpiVisible, setKpiVisible] = useState(false);
  const [barChartVisible, setBarChartVisible] = useState(false);
  const [areaChartVisible, setAreaChartVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setKpiVisible(true), 30);
    const t2 = setTimeout(() => setBarChartVisible(true), 200);
    const t3 = setTimeout(() => setAreaChartVisible(true), 350);
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

  const kpiDefs = [0, 1, 2, 3];

  return (
    <div className="space-y-6">

      {/* ── Section 1 : Métriques clés ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiDefs.map((idx) => (
          <div
            key={idx}
            style={{
              opacity: kpiVisible ? 1 : 0,
              transform: kpiVisible ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 0.4s ease, transform 0.4s ease`,
              transitionDelay: `${idx * 65}ms`,
            }}
          >
            {idx === 0 && (
              <StatCard
                label="Nouveaux clients"
                value={String(data.new_clients_this_period)}
                icon={Users}
                change="Sur la période sélectionnée"
                changeType="neutral"
              />
            )}
            {idx === 1 && (
              <StatCard
                label="Clients fidèles (≥2 achats)"
                value={String(data.returning_clients)}
                icon={UserCheck}
                change="Ont acheté plusieurs fois"
                changeType="positive"
              />
            )}
            {idx === 2 && (
              <StatCard
                label="Clients avec crédit"
                value={String(data.clients_with_credit.count)}
                icon={CreditCard}
                change="Crédit en cours"
                changeType={data.clients_with_credit.count > 0 ? "negative" : "neutral"}
              />
            )}
            {idx === 3 && (
              <StatCard
                label="Total crédit en cours"
                value={formatFcfaFull(data.clients_with_credit.total_credit)}
                icon={CreditCard}
                change="Montant total dû"
                changeType={data.clients_with_credit.total_credit > 0 ? "negative" : "neutral"}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Section 2 : Top 10 clients ── */}
      <div
        className="card-premium p-6"
        style={{
          opacity: barChartVisible ? 1 : 0,
          transform: barChartVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
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
                fill="hsl(22, 72%, 48%)"
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Section 3 : Évolution clients ── */}
      {byPeriod.length > 0 && (
        <div
          className="card-premium p-6"
          style={{
            opacity: areaChartVisible ? 1 : 0,
            transform: areaChartVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
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
            <AreaChart
              data={byPeriod}
              margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradNewClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(22, 72%, 48%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(22, 72%, 48%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradActiveClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152, 38%, 38%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(152, 38%, 38%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="new_clients"
                name="Nouveaux clients"
                stroke="hsl(22, 72%, 48%)"
                strokeWidth={2.5}
                fill="url(#gradNewClients)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(22, 72%, 48%)", stroke: "white", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="active_clients"
                name="Clients actifs"
                stroke="hsl(152, 38%, 38%)"
                strokeWidth={2.5}
                fill="url(#gradActiveClients)"
                dot={false}
                activeDot={{ r: 5, fill: "hsl(152, 38%, 38%)", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
