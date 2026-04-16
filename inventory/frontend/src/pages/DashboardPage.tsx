import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCountUp } from "@/hooks/useCountUp";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  Clock,
  PlusCircle,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "year";

interface KpiData {
  sales: string;
  salesRaw: number;
  salesSuffix: string;
  salesChange: string;
  salesSpark: number[];
  transactions: string;
  transactionsRaw: number;
  transactionsChange: string;
  transactionsSpark: number[];
  avgCart: string;
  avgCartRaw: number;
  avgCartChange: string;
  avgCartSpark: number[];
  monthly: string;
  monthlyRaw: number;
  monthlySuffix: string;
  monthlyChange: string;
  monthlySpark: number[];
}

interface ActivityItem {
  id: string;
  type: "sale" | "add" | "edit";
  description: string;
  timestamp: string;
}

// ─── Mock data par période ────────────────────────────────────────────────────

const kpiByPeriod: Record<Period, KpiData> = {
  today: {
    sales: "215 000 FCFA",
    salesRaw: 215000,
    salesSuffix: " FCFA",
    salesChange: "+12.5% vs hier",
    salesSpark: [120, 145, 98, 175, 160, 190, 215],
    transactions: "24",
    transactionsRaw: 24,
    transactionsChange: "+3 vs hier",
    transactionsSpark: [14, 18, 12, 22, 20, 21, 24],
    avgCart: "8 958 FCFA",
    avgCartRaw: 8958,
    avgCartChange: "+4.2% vs hier",
    avgCartSpark: [7200, 7800, 8100, 8500, 8200, 8700, 8958],
    monthly: "4.2M FCFA",
    monthlyRaw: 4200000,
    monthlySuffix: " FCFA",
    monthlyChange: "+8.3% ce mois",
    monthlySpark: [3.1, 3.4, 3.2, 3.7, 3.9, 4.0, 4.2],
  },
  week: {
    sales: "1.48M FCFA",
    salesRaw: 1480000,
    salesSuffix: " FCFA",
    salesChange: "+9.1% vs semaine dernière",
    salesSpark: [180, 210, 195, 230, 215, 225, 230],
    transactions: "162",
    transactionsRaw: 162,
    transactionsChange: "+18 vs semaine dernière",
    transactionsSpark: [20, 24, 22, 26, 23, 25, 22],
    avgCart: "9 136 FCFA",
    avgCartRaw: 9136,
    avgCartChange: "+2.8% vs semaine dernière",
    avgCartSpark: [8500, 8800, 9000, 9100, 8900, 9200, 9136],
    monthly: "4.2M FCFA",
    monthlyRaw: 4200000,
    monthlySuffix: " FCFA",
    monthlyChange: "+8.3% ce mois",
    monthlySpark: [3.1, 3.4, 3.2, 3.7, 3.9, 4.0, 4.2],
  },
  month: {
    sales: "4.2M FCFA",
    salesRaw: 4200000,
    salesSuffix: " FCFA",
    salesChange: "+8.3% vs mois dernier",
    salesSpark: [3100, 3400, 3200, 3700, 3900, 4000, 4200],
    transactions: "698",
    transactionsRaw: 698,
    transactionsChange: "+52 vs mois dernier",
    transactionsSpark: [600, 620, 590, 650, 680, 690, 698],
    avgCart: "6 018 FCFA",
    avgCartRaw: 6018,
    avgCartChange: "+1.5% vs mois dernier",
    avgCartSpark: [5700, 5800, 5900, 5950, 6000, 6010, 6018],
    monthly: "4.2M FCFA",
    monthlyRaw: 4200000,
    monthlySuffix: " FCFA",
    monthlyChange: "Ce mois en cours",
    monthlySpark: [3.1, 3.4, 3.2, 3.7, 3.9, 4.0, 4.2],
  },
  year: {
    sales: "48.6M FCFA",
    salesRaw: 48600000,
    salesSuffix: " FCFA",
    salesChange: "+15.2% vs année dernière",
    salesSpark: [34, 38, 41, 43, 45, 47, 48.6],
    transactions: "8 124",
    transactionsRaw: 8124,
    transactionsChange: "+842 vs année dernière",
    transactionsSpark: [6500, 7000, 7200, 7600, 7800, 8000, 8124],
    avgCart: "5 983 FCFA",
    avgCartRaw: 5983,
    avgCartChange: "+0.8% vs année dernière",
    avgCartSpark: [5700, 5750, 5800, 5850, 5900, 5960, 5983],
    monthly: "48.6M FCFA",
    monthlyRaw: 48600000,
    monthlySuffix: " FCFA",
    monthlyChange: "+15.2% vs année dernière",
    monthlySpark: [34, 38, 41, 43, 45, 47, 48.6],
  },
};

const recentSales = [
  { id: "VNT-001", date: "14/04/2026 09:32", items: 3, total: "45 000 FCFA", status: "completed" as const },
  { id: "VNT-002", date: "14/04/2026 10:15", items: 1, total: "12 500 FCFA", status: "completed" as const },
  { id: "VNT-003", date: "14/04/2026 11:42", items: 5, total: "78 000 FCFA", status: "completed" as const },
  { id: "VNT-004", date: "14/04/2026 13:08", items: 2, total: "23 000 FCFA", status: "completed" as const },
  { id: "VNT-005", date: "14/04/2026 14:20", items: 4, total: "56 500 FCFA", status: "completed" as const },
];

const lowStock = [
  { name: "Lait Nido 400g", stock: 3, min: 10 },
  { name: "Huile Dinor 1L", stock: 5, min: 15 },
  { name: "Riz Uncle Ben's 5kg", stock: 2, min: 8 },
  { name: "Savon Palmolive", stock: 4, min: 12 },
];

const recentActivity: ActivityItem[] = [
  { id: "act-1", type: "sale", description: "Vente VNT-005 — 56 500 FCFA (4 articles)", timestamp: "il y a 12 min" },
  { id: "act-2", type: "add", description: "Nouveau produit ajouté : Eau Tangui 1.5L", timestamp: "il y a 28 min" },
  { id: "act-3", type: "sale", description: "Vente VNT-004 — 23 000 FCFA (2 articles)", timestamp: "il y a 1h04" },
  { id: "act-4", type: "edit", description: "Stock mis à jour : Lait Nido 400g → 3 unités", timestamp: "il y a 1h30" },
  { id: "act-5", type: "sale", description: "Vente VNT-003 — 78 000 FCFA (5 articles)", timestamp: "il y a 2h45" },
  { id: "act-6", type: "add", description: "Nouveau produit ajouté : Biscuits Belvita", timestamp: "il y a 3h10" },
];

const periodLabels: Record<Period, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className={cn("flex items-end gap-0.5 h-6", className)}>
      {data.map((val, i) => {
        const heightPct = ((val - min) / range) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm transition-all",
              isLast ? "bg-primary" : "bg-primary/25"
            )}
            style={{ height: `${Math.max(15, heightPct)}%` }}
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

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const config = {
    sale: { icon: ShoppingBag, bg: "bg-success/10", color: "text-success" },
    add: { icon: PlusCircle, bg: "bg-primary/10", color: "text-primary" },
    edit: { icon: Edit3, bg: "bg-warning/10", color: "text-warning" },
  };
  const { icon: Icon, bg, color } = config[type];
  return (
    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", bg)}>
      <Icon className={cn("w-3.5 h-3.5", color)} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("today");

  const kpi = kpiByPeriod[period];

  return (
    <>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Header row: period selector + CTA caisse ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
              className="text-sm font-medium bg-card border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {(Object.keys(periodLabels) as Period[]).map(p => (
                <option key={p} value={p}>{periodLabels[p]}</option>
              ))}
            </select>
          </div>

          {/* Bouton ouverture caisse */}
          <button
            onClick={() => navigate("/pos")}
            className="group flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Ouvrir la caisse
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div
            className="stat-card"
            style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "0ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="stat-label">Ventes</span>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="stat-value">
              <KpiValue key={`sales-${period}`} end={kpi.salesRaw} suffix={kpi.salesSuffix} duration={1200} />
            </div>
            <p className="text-xs mt-1 font-medium text-success">{kpi.salesChange}</p>
            <Sparkline data={kpi.salesSpark} className="mt-3" />
          </div>

          <div
            className="stat-card"
            style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "80ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="stat-label">Transactions</span>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="stat-value">
              <KpiValue key={`tx-${period}`} end={kpi.transactionsRaw} suffix="" duration={800} />
            </div>
            <p className="text-xs mt-1 font-medium text-success">{kpi.transactionsChange}</p>
            <Sparkline data={kpi.transactionsSpark} className="mt-3" />
          </div>

          <div
            className="stat-card"
            style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "160ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="stat-label">Panier moyen</span>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="stat-value">
              <KpiValue key={`avg-${period}`} end={kpi.avgCartRaw} suffix=" FCFA" duration={1000} />
            </div>
            <p className="text-xs mt-1 font-medium text-success">{kpi.avgCartChange}</p>
            <Sparkline data={kpi.avgCartSpark} className="mt-3" />
          </div>

          <div
            className="stat-card"
            style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: "240ms" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="stat-label">Chiffre total</span>
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="stat-value">
              <KpiValue key={`monthly-${period}`} end={kpi.monthlyRaw} suffix={kpi.monthlySuffix} duration={1200} />
            </div>
            <p className="text-xs mt-1 font-medium text-success">{kpi.monthlyChange}</p>
            <Sparkline data={kpi.monthlySpark} className="mt-3" />
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ventes récentes (span 2) */}
          <div className="lg:col-span-2 bg-card rounded-lg border">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Ventes récentes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Réf.</th>
                    <th>Date</th>
                    <th>Articles</th>
                    <th>Total</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(sale => (
                    <tr key={sale.id}>
                      <td className="font-medium">{sale.id}</td>
                      <td>{sale.date}</td>
                      <td>{sale.items}</td>
                      <td className="font-medium">{sale.total}</td>
                      <td><StatusBadge label="Terminée" variant="success" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-6">

            {/* Widget Alertes stock */}
            <div className="bg-card rounded-lg border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <h2 className="text-sm font-semibold">Alertes stock</h2>
                  {/* Compteur animé */}
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold animate-pulse">
                    {lowStock.length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {lowStock.map(item => (
                  <button
                    key={item.name}
                    onClick={() => navigate("/stock")}
                    className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary/60 transition-colors text-left group"
                  >
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Min: {item.min} unités</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge label={`${item.stock} restants`} variant="danger" />
                      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => navigate("/stock")}
                  className="w-full py-2 text-xs font-semibold text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                >
                  Voir tout le stock →
                </button>
              </div>
            </div>

            {/* Widget Activité récente */}
            <div className="bg-card rounded-lg border flex flex-col">
              <div className="px-5 py-4 border-b">
                <h2 className="text-sm font-semibold">Activité récente</h2>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[260px]">
                {recentActivity.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-start gap-3">
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug">{item.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4 mt-auto border-t pt-3">
                <button
                  onClick={() => navigate("/reports")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Voir plus →
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
