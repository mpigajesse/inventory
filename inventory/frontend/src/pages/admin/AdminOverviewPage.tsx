import { useOutletContext, useNavigate, Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingBag,
  LogIn,
  Tag,
  Package,
  Settings,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
  Trophy,
  Medal,
  Award,
  Barcode,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { activityService } from "@/services/activityService";
import type { ActivityLog, VendeurActivitySummary } from "@/services/activityService";
import { salesService } from "@/services/salesService";
import type { DailyStat } from "@/services/salesService";
import { productService } from "@/services/productService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Constants ────────────────────────────────────────────────────────────────

const COPPER = "hsl(22 72% 48%)";
const COPPER_LIGHT = "hsl(36 88% 52%)";
const FOREST = "hsl(152 38% 38%)";
const AMBER = "hsl(36 88% 52%)";

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
}

// Fuseau horaire de Libreville (Gabon) — UTC+1, pas de DST
const LIBREVILLE_TZ = "Africa/Libreville";

function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: LIBREVILLE_TZ });
}

function formatRelative(isoDate: string | null): string {
  if (!isoDate) return "Jamais connecté";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: LIBREVILLE_TZ });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

type ActivityType = "login" | "sale" | "product" | "stock" | "system";

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ElementType; bg: string; color: string }> = {
  login:   { icon: LogIn,       bg: "rgba(139,90,43,0.10)",  color: COPPER },
  sale:    { icon: ShoppingBag, bg: "rgba(56,142,86,0.10)",  color: FOREST },
  product: { icon: Tag,         bg: "rgba(202,138,4,0.10)",  color: AMBER },
  stock:   { icon: Package,     bg: "rgba(139,90,43,0.10)",  color: COPPER },
  system:  { icon: Settings,    bg: "rgba(100,100,100,0.08)", color: "#888" },
};

function resolveActivityType(action: string, targetModel: string): ActivityType {
  if (targetModel === "sale" || targetModel === "saleitem") return "sale";
  if (targetModel === "product") return "product";
  if (targetModel === "stock" || targetModel === "stockmovement") return "stock";
  if (action === "login" || action === "logout") return "login";
  return "system";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pulsing live dot */
function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: FOREST }}
      />
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ background: FOREST }}
      />
    </span>
  );
}

/** Period tab selector */
function PeriodTabs({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        background: "hsl(var(--muted))",
        borderRadius: "10px",
        padding: "3px",
        gap: "2px",
      }}
    >
      {(["today", "week", "month"] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            padding: "5px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: value === p ? 600 : 400,
            color: value === p ? "#fff" : "hsl(var(--muted-foreground))",
            background: value === p
              ? `linear-gradient(135deg, ${COPPER}, ${COPPER_LIGHT})`
              : "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.18s ease",
            whiteSpace: "nowrap",
            flex: "1 1 auto",
            textAlign: "center",
          }}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

/** Copper gradient avatar circle */
function VendeurAvatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${COPPER}, ${COPPER_LIGHT})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: `0 2px 8px ${COPPER}44`,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/** Vendeur performance card */
function VendeurCard({ vendeur, delay }: { vendeur: VendeurActivitySummary; delay: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/users/${vendeur.user_id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "hsl(var(--card))",
          border: `1px solid hsl(var(--border))`,
          borderRadius: 16,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: hovered
            ? `0 8px 24px ${COPPER}22, 0 2px 8px hsl(22 30% 15% / 0.10)`
            : `0 1px 4px hsl(22 30% 15% / 0.06)`,
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          transition: "all 0.2s ease",
          animationDelay: `${delay}ms`,
          cursor: "pointer",
        }}
      >
        {/* Header: avatar + name + last seen */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <VendeurAvatar name={vendeur.full_name || vendeur.username} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1.3 }}>
              {vendeur.full_name || vendeur.username}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <Clock style={{ width: 11, height: 11, color: "hsl(var(--muted-foreground))" }} />
              <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                {formatRelative(vendeur.last_action_at)}
              </span>
            </div>
          </div>
          <ArrowRight style={{ width: 14, height: 14, color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
        </div>

        {/* Big sales count */}
        <div>
          <span
            style={{
              fontFamily: "'Fraunces', 'Georgia', serif",
              fontWeight: 900,
              fontSize: 36,
              color: COPPER,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {vendeur.sales_count}
          </span>
          <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginLeft: 6 }}>
            ventes
          </span>
        </div>

        {/* Revenue */}
        <div
          style={{
            background: `${COPPER}0d`,
            borderRadius: 10,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: COPPER, fontWeight: 500 }}>Chiffre d'affaires</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: COPPER }}>
            {formatFCFA(vendeur.total_revenue)}
          </span>
        </div>

        {/* Actions count + last action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Activity style={{ width: 12, height: 12, color: FOREST }} />
            <span style={{ fontSize: 12, color: FOREST, fontWeight: 600 }}>
              {vendeur.action_count} actions
            </span>
          </div>
          {vendeur.last_action && (
            <p
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={vendeur.last_action}
            >
              {vendeur.last_action}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Activity feed item */
function ActivityItem({ entry, isLast }: { entry: ActivityLog; isLast: boolean }) {
  const type = resolveActivityType(entry.action, entry.target_model);
  const { icon: Icon, bg, color } = ACTIVITY_CONFIG[type];
  const isSale = type === "sale";

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      {/* Timeline line + icon */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon style={{ width: 14, height: 14, color }} />
        </div>
        {!isLast && (
          <div
            style={{
              width: 1,
              flex: 1,
              background: "hsl(var(--border))",
              minHeight: 12,
              marginTop: 2,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, flex: 1, minWidth: 0 }}>
            {entry.description}
          </p>
          {isSale && entry.sale_amount != null && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: FOREST,
                background: `${FOREST}14`,
                borderRadius: 6,
                padding: "1px 8px",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {formatFCFA(entry.sale_amount)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: COPPER,
              background: `${COPPER}14`,
              borderRadius: 5,
              padding: "1px 7px",
            }}
          >
            {entry.user_name ?? "Système"}
          </span>
          <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
            {formatTime(entry.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Leaderboard rank item */
function LeaderboardItem({ stat, rank }: { stat: DailyStat; rank: number }) {
  const medals = [
    { icon: Trophy, color: "#c9a227", bg: "#c9a22718", label: "Or" },
    { icon: Medal,  color: "#9e9e9e", bg: "#9e9e9e18", label: "Argent" },
    { icon: Award,  color: "#a0522d", bg: "#a0522d18", label: "Bronze" },
  ];
  const medal = medals[rank - 1];
  const Icon = medal?.icon ?? TrendingUp;
  const medColor = medal?.color ?? COPPER;
  const medBg = medal?.bg ?? `${COPPER}14`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 12,
        background: rank === 1 ? "#c9a22708" : "transparent",
        border: rank === 1 ? `1px solid #c9a22730` : "1px solid transparent",
      }}
    >
      {/* Rank badge */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: medBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 16, height: 16, color: medColor }} />
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {stat.cashier_name}
        </p>
        <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: 0 }}>
          {stat.sales_count} vente{stat.sales_count > 1 ? "s" : ""}
        </p>
      </div>

      {/* Revenue */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: medColor,
          flexShrink: 0,
        }}
      >
        {formatFCFA(stat.total_revenue)}
      </span>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {[60, 40, 80, 50].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? 16 : 12,
            width: `${w}%`,
            borderRadius: 6,
            background: "hsl(var(--muted))",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [period, setPeriod] = useState<Period>("today");
  const [mounted, setMounted] = useState(false);
  const accentBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (currentUser?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: vendeurSummaries, isLoading: summaryLoading } = useQuery({
    queryKey: ["vendeur-summary", period],
    queryFn: () => activityService.getVendeurSummary(period),
    // Aligne avec le polling des activités — évite un re-fetch immédiat au retour sur la page
    staleTime: 30_000,
  });

  // Activity feed — auto-refreshed every 30s
  const activityParams: Record<string, string> = { page_size: "15" };
  if (period === "today") activityParams.date = "today";
  else if (period === "week") activityParams.date = "week";
  else activityParams.date = "month";

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["activity-feed", period],
    queryFn: () => activityService.getAll(activityParams),
    refetchInterval: 30_000,
  });

  const { data: dailyStats, isLoading: statsLoading } = useQuery({
    queryKey: ["daily-stats", period],
    queryFn: () => salesService.getDailyStats(period),
    staleTime: 30_000,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll({ page_size: "1000" }),
    staleTime: 5 * 60_000,
  });

  const noBarcodesCount = (productsData?.results ?? []).filter((p) => !p.barcode).length;

  const recentActivity: ActivityLog[] = activityData?.results ?? [];
  const vendeurs: VendeurActivitySummary[] = vendeurSummaries ?? [];
  const leaderboard: DailyStat[] = (dailyStats ?? [])
    .slice()
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 3);

  return (
    <>
      <style>{`
        @keyframes adminFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <Topbar
        title="Administration"
        subtitle="Surveillance vendeurs·ses"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── 1. Header ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: "1 1 auto" }}>
            {/* Accent bar */}
            <div
              ref={accentBarRef}
              style={{
                width: 3,
                height: 32,
                borderRadius: 2,
                background: `linear-gradient(to bottom, ${COPPER}, ${AMBER})`,
                transformOrigin: "top",
                transform: mounted ? "scaleY(1)" : "scaleY(0)",
                transition: "transform 0.3s ease-out",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    margin: 0,
                    fontFamily: "'Fraunces', 'Georgia', serif",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Surveillance vendeurs
                </h1>
                <LiveDot />
              </div>
              <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0, marginTop: 2 }}>
                Activité en temps réel · mise à jour toutes les 30 s
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div style={{ flexShrink: 0, width: "100%", maxWidth: 320 }}>
            <PeriodTabs value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* ── 1b. KPI — produits sans code-barres ─────────────────────── */}
        <div
          onClick={() => navigate("/barcodes")}
          style={{
            display: "flex",
            alignSelf: "stretch",
            alignItems: "center",
            gap: 14,
            background: "hsl(var(--card))",
            border: `1px solid hsl(var(--border))`,
            borderRadius: 14,
            padding: "14px 20px",
            cursor: "pointer",
            boxShadow: "0 1px 4px hsl(22 30% 15% / 0.06)",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 18px ${COPPER}22, 0 1px 4px hsl(22 30% 15% / 0.08)`;
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px hsl(22 30% 15% / 0.06)";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${COPPER}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Barcode style={{ width: 18, height: 18, color: COPPER }} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", margin: 0, marginBottom: 2 }}>
              Sans code-barres
            </p>
            {productsLoading ? (
              <div
                style={{
                  height: 24,
                  width: 48,
                  borderRadius: 6,
                  background: "hsl(var(--muted))",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  fontFamily: "'Fraunces', 'Georgia', serif",
                  color: noBarcodesCount > 0 ? COPPER : FOREST,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {noBarcodesCount}
              </span>
            )}
          </div>
          <ArrowRight style={{ width: 14, height: 14, color: "hsl(var(--muted-foreground))", marginLeft: 4, flexShrink: 0 }} />
        </div>

        {/* ── 2. Vendeur performance grid ──────────────────────────────── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `${COPPER}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity style={{ width: 14, height: 14, color: COPPER }} />
            </div>
            <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Performance vendeurs</h2>
          </div>

          {summaryLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
                gap: 16,
              }}
            >
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : vendeurs.length === 0 ? (
            <div
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                color: "hsl(var(--muted-foreground))",
                fontSize: 13,
              }}
            >
              Aucune activité vendeur pour cette période.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))",
                gap: 16,
              }}
            >
              {vendeurs.map((v, i) => (
                <VendeurCard key={v.user_id} vendeur={v} delay={i * 60} />
              ))}
            </div>
          )}
        </section>

        {/* ── 3 + 4. Activity feed + Leaderboard side by side ──────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 items-start">

          {/* ── Activity feed ─────────────────────────────── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: `${FOREST}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock style={{ width: 14, height: 14, color: FOREST }} />
                </div>
                <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Journal d'activité</h2>
                <LiveDot />
              </div>
              <button
                onClick={() => navigate("/admin/activity")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                  color: COPPER,
                  background: `${COPPER}12`,
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                Voir tout
                <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>

            <div
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 16,
                padding: "16px 20px",
                boxShadow: "0 1px 4px hsl(22 30% 15% / 0.05)",
              }}
            >
              {activityLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "hsl(var(--muted))", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 12, width: "75%", borderRadius: 6, background: "hsl(var(--muted))", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ height: 10, width: "45%", borderRadius: 6, background: "hsl(var(--muted))", animation: "pulse 1.5s ease-in-out infinite" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13, padding: "24px 0" }}>
                  Aucune activité pour cette période.
                </p>
              ) : (
                <div>
                  {recentActivity.map((entry, idx) => (
                    <ActivityItem key={entry.id} entry={entry} isLast={idx === recentActivity.length - 1} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Leaderboard ───────────────────────────────── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#c9a22718",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy style={{ width: 14, height: 14, color: "#c9a227" }} />
              </div>
              <h2 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Classement ventes</h2>
            </div>

            <div
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 16,
                padding: "8px",
                boxShadow: "0 1px 4px hsl(22 30% 15% / 0.05)",
              }}
            >
              {statsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 8px" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "hsl(var(--muted))", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 12, width: "60%", borderRadius: 6, background: "hsl(var(--muted))", animation: "pulse 1.5s ease-in-out infinite" }} />
                        <div style={{ height: 10, width: "40%", borderRadius: 6, background: "hsl(var(--muted))", animation: "pulse 1.5s ease-in-out infinite" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <p style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13, padding: "32px 16px" }}>
                  Aucune vente pour cette période.
                </p>
              ) : (
                <div>
                  {leaderboard.map((stat, idx) => (
                    <LeaderboardItem key={stat.cashier_id} stat={stat} rank={idx + 1} />
                  ))}
                </div>
              )}
            </div>

            {/* Quick nav to users */}
            <button
              onClick={() => navigate("/users")}
              style={{
                marginTop: 12,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 0",
                borderRadius: 10,
                border: `1px solid hsl(var(--border))`,
                background: "hsl(var(--card))",
                fontSize: 12,
                fontWeight: 500,
                color: "hsl(var(--muted-foreground))",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = COPPER;
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${COPPER}40`;
                (e.currentTarget as HTMLButtonElement).style.background = `${COPPER}08`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
                (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--card))";
              }}
            >
              Gérer les utilisateurs
              <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </section>
        </div>

      </div>
    </>
  );
}
