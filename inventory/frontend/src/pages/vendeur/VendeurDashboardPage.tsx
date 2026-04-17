import { useNavigate, useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  Receipt,
  UserCheck,
  Sparkles,
  Calendar,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useCountUp } from "@/hooks/useCountUp";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFirstName(fullName: string | undefined): string {
  if (!fullName) return "Vendeur";
  const trimmed = fullName.trim();
  if (!trimmed) return "Vendeur";
  return trimmed.split(/\s+/)[0];
}

function getInitials(fullName: string | undefined): string {
  if (!fullName) return "V";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

// ─── Mock data ────────────────────────────────────────────────────────────────

type VendeurKpiTint = "primary" | "accent" | "info";

const tintMap: Record<VendeurKpiTint, { bg: string; fg: string; ring: string; gradient: string }> = {
  primary: {
    bg: "bg-primary/12",
    fg: "text-primary",
    ring: "ring-primary/20",
    gradient: "from-primary/[0.07] via-transparent",
  },
  accent: {
    bg: "bg-accent/14",
    fg: "text-accent",
    ring: "ring-accent/20",
    gradient: "from-accent/[0.07] via-transparent",
  },
  info: {
    bg: "bg-[hsl(var(--badge-blue))]/14",
    fg: "text-[hsl(var(--badge-blue))]",
    ring: "ring-[hsl(var(--badge-blue))]/20",
    gradient: "from-[hsl(var(--badge-blue))]/[0.07] via-transparent",
  },
};

const vendeurKpis: Array<{
  label: string;
  numericEnd: number;
  suffix: string;
  duration: number;
  change: string;
  trendDir: "up" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  tint: VendeurKpiTint;
}> = [
  {
    label: "Mes ventes aujourd'hui",
    numericEnd: 87500,
    suffix: " FCFA",
    duration: 1200,
    change: "+12%",
    trendDir: "up",
    icon: TrendingUp,
    tint: "accent",
  },
  {
    label: "Transactions",
    numericEnd: 9,
    suffix: "",
    duration: 800,
    change: "+2",
    trendDir: "up",
    icon: Receipt,
    tint: "primary",
  },
  {
    label: "Clients servis",
    numericEnd: 9,
    suffix: "",
    duration: 800,
    change: "Aujourd'hui",
    trendDir: "neutral",
    icon: UserCheck,
    tint: "info",
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
  const { currentUser } = useAuth();

  const today = new Date();
  const fullName = currentUser?.name;
  const firstName = getFirstName(fullName);
  const initials = getInitials(fullName);
  const greeting = getGreeting(today);

  return (
    <>
      <Topbar
        title="Mon tableau de bord"
        subtitle="Espace vendeur"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">

        {/* ── Hero header vendeur ── */}
        <div
          className="relative overflow-hidden rounded-2xl border bg-card p-5 md:p-6 mb-6"
          style={{
            boxShadow: "0 2px 16px hsl(22 72% 48% / 0.06)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-accent/[0.06]"
          />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="relative w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0"
                style={{ boxShadow: "0 6px 20px hsl(22 72% 48% / 0.30)" }}
              >
                {initials}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    <Sparkles className="w-3 h-3 text-primary" />
                    {greeting}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
                  {firstName}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge label="Vendeur" variant="info" />
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                    <Calendar className="w-3 h-3" />
                    <span className="capitalize">{formatLongDate(today)}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/vendeur/pos")}
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.97] transition-all w-full md:w-auto justify-center"
              style={{ boxShadow: "0 8px 24px hsl(22 72% 48% / 0.26)" }}
            >
              <ShoppingCart className="w-4 h-4" />
              Ouvrir la caisse
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {vendeurKpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const t = tintMap[kpi.tint];
            return (
              <div
                key={kpi.label}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border bg-card p-5",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                )}
                style={{
                  animation: "fadeInUp 0.45s ease-out both",
                  animationDelay: `${index * 80}ms`,
                  boxShadow: "0 1px 2px hsl(20 25% 12% / 0.04), 0 2px 12px hsl(22 72% 48% / 0.04)",
                }}
              >
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
                      {kpi.label}
                    </span>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", t.bg)}>
                      <Icon className={cn("w-5 h-5", t.fg)} />
                    </div>
                  </div>
                  <div className="text-[1.65rem] md:text-[1.9rem] font-bold leading-none tracking-tight tabular-nums">
                    <VendeurKpiValue end={kpi.numericEnd} suffix={kpi.suffix} duration={kpi.duration} />
                  </div>
                  <div className="mt-3 flex items-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                        kpi.trendDir === "up" && "bg-success/12 text-success",
                        kpi.trendDir === "neutral" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {kpi.trendDir === "up" && <ArrowUpRight className="w-3 h-3" />}
                      {kpi.change}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mes dernières ventes ── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="border-l-4 border-primary pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-0.5">
                Activité
              </p>
              <h2 className="text-base md:text-lg font-bold tracking-tight">
                Mes dernières ventes
              </h2>
            </div>
            <StatusBadge label="Aujourd'hui" variant="info" />
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden" style={{ boxShadow: "0 2px 12px hsl(22 72% 48% / 0.05)" }}>
            {/* Mobile cards — md:hidden */}
            <div className="md:hidden divide-y">
              {mesDerniereVentes.map((vente) => (
                <div
                  key={vente.id}
                  className="p-4 flex items-start justify-between gap-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{vente.id}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {vente.heure} · {vente.articles} article{vente.articles !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm font-bold mt-1 tabular-nums">{vente.total}</p>
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
                    <th>Heure</th>
                    <th>Articles</th>
                    <th className="text-right">Total</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {mesDerniereVentes.map((vente) => (
                    <tr key={vente.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                          <span className="font-semibold">{vente.id}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground tabular-nums">{vente.heure}</td>
                      <td className="tabular-nums">{vente.articles}</td>
                      <td className="font-semibold tabular-nums text-right">{vente.total}</td>
                      <td>
                        <StatusBadge label="Terminée" variant="success" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t bg-secondary/30">
              <button
                onClick={() => navigate("/invoices")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Voir toutes mes factures
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
