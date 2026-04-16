import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

const dailySales = [
  { day: "Lun", total: 180000 },
  { day: "Mar", total: 215000 },
  { day: "Mer", total: 195000 },
  { day: "Jeu", total: 240000 },
  { day: "Ven", total: 310000 },
  { day: "Sam", total: 420000 },
  { day: "Dim", total: 150000 },
];

const topProducts = [
  { name: "Coca-Cola 1.5L", sold: 120, revenue: "144 000 FCFA" },
  { name: "Eau Tangui 1.5L", sold: 98, revenue: "49 000 FCFA" },
  { name: "Lait Nido 400g", sold: 45, revenue: "157 500 FCFA" },
  { name: "Riz Uncle Ben's 5kg", sold: 32, revenue: "256 000 FCFA" },
  { name: "Pâtes Panzani 500g", sold: 28, revenue: "42 000 FCFA" },
];

const maxSale = Math.max(...dailySales.map(d => d.total));

export default function ReportsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();

  return (
    <>
      <Topbar title="Rapports" subtitle="Statistiques de ventes et performances" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Ventes semaine" value="1.71M FCFA" change="+15.2%" changeType="positive" icon={DollarSign} />
          <StatCard label="Transactions" value="187" icon={ShoppingCart} />
          <StatCard label="Panier moyen" value="9 144 FCFA" change="+3.1%" changeType="positive" icon={TrendingUp} />
          <StatCard label="Clients actifs" value="42" icon={Users} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Simple bar chart */}
          <div className="bg-card rounded-lg border p-5">
            <h2 className="text-sm font-semibold mb-6">Ventes par jour (semaine)</h2>
            <div className="flex items-end gap-2 sm:gap-3 h-48">
              {dailySales.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {(d.total / 1000).toFixed(0)}k
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${(d.total / maxSale) * 100}%`,
                      background: "hsl(var(--primary))",
                      opacity: 0.8,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-card rounded-lg border">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold">Produits les plus vendus</h2>
            </div>
            <div className="p-4 space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 sm:gap-4">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sold} vendus</p>
                  </div>
                  <span className="text-xs sm:text-sm font-medium shrink-0 text-right">{p.revenue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
