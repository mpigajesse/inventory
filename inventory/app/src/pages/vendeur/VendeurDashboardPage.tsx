import { useNavigate, useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShoppingCart, ArrowRight, TrendingUp, Receipt, UserCheck } from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useCountUp } from "@/hooks/useCountUp";

// ─── Mock data ────────────────────────────────────────────────────────────────

const vendeurKpis = [
  {
    label: "Mes ventes aujourd'hui",
    value: "87 500 FCFA",
    numericEnd: 87500,
    suffix: " FCFA",
    duration: 1200,
    change: "+12% vs hier",
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    label: "Nb transactions",
    value: "9",
    numericEnd: 9,
    suffix: "",
    duration: 800,
    change: "+2 vs hier",
    icon: Receipt,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Clients servis",
    value: "9",
    numericEnd: 9,
    suffix: "",
    duration: 800,
    change: "Aujourd'hui",
    icon: UserCheck,
    color: "text-info",
    bg: "bg-primary/10",
  },
];

function VendeurKpiValue({ end, suffix, duration }: { end: number; suffix: string; duration: number }) {
  const counted = useCountUp({ end, duration });
  return <>{counted}{suffix}</>;
}

const mesDerniereVentes = [
  { id: "VNT-023", heure: "14:20", articles: 4, total: "56 500 FCFA" },
  { id: "VNT-022", heure: "13:08", articles: 2, total: "23 000 FCFA" },
  { id: "VNT-021", heure: "11:42", articles: 5, total: "78 000 FCFA" },
  { id: "VNT-020", heure: "10:15", articles: 1, total: "12 500 FCFA" },
  { id: "VNT-019", heure: "09:32", articles: 3, total: "45 000 FCFA" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VendeurDashboardPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();

  return (
    <>
      <Topbar
        title="Mon tableau de bord"
        subtitle="Bienvenue, Marie — Espace vendeur"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">

        {/* Bandeau vendeur */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
              M
            </div>
            <div>
              <p className="text-sm font-semibold">Marie Vendeur</p>
              <StatusBadge label="Vendeur" variant="info" />
            </div>
          </div>

          {/* CTA principal */}
          <button
            onClick={() => navigate("/vendeur/pos")}
            className="group flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Ouvrir la caisse
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {vendeurKpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="stat-card"
                style={{ animation: "fadeInUp 0.4s ease-out both", animationDelay: `${index * 80}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="stat-label">{kpi.label}</span>
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${kpi.bg}`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className="stat-value">
                  <VendeurKpiValue end={kpi.numericEnd} suffix={kpi.suffix} duration={kpi.duration} />
                </div>
                <p className={`text-xs mt-1 font-medium ${kpi.color}`}>{kpi.change}</p>
              </div>
            );
          })}
        </div>

        {/* Mes dernières ventes */}
        <div className="bg-card rounded-lg border">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Mes dernières ventes</h2>
            <StatusBadge label="Aujourd'hui" variant="info" />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Heure</th>
                  <th>Articles</th>
                  <th>Total</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {mesDerniereVentes.map((vente) => (
                  <tr key={vente.id}>
                    <td className="font-medium">{vente.id}</td>
                    <td>{vente.heure}</td>
                    <td>{vente.articles}</td>
                    <td className="font-medium">{vente.total}</td>
                    <td>
                      <StatusBadge label="Terminée" variant="success" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t">
            <button
              onClick={() => navigate("/invoices")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir toutes mes factures →
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
