import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  Package,
  Settings,
  UserCog,
  X,
  CheckCheck,
  ShoppingCart,
  Loader2,
  BellOff,
  AlertCircle,
  Info,
  ShoppingBag,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  notificationService,
  type Notification,
} from "@/services/notificationService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifDisplay = "stock_critical" | "stock_low" | "new_sale" | "new_client" | "system";
type TabKey = "toutes" | "non_lues" | "stock" | "ventes" | "systeme";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<TabKey, string> = {
  toutes: "Toutes",
  non_lues: "Non lues",
  stock: "Stock",
  ventes: "Ventes",
  systeme: "Système",
};

const TYPE_ICON: Record<NotifDisplay, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  stock_critical: AlertTriangle,
  stock_low:      AlertCircle,
  new_sale:       ShoppingBag,
  new_client:     UserCog,
  system:         Info,
};

// Raw HSL values for inline style usage (no Tailwind opacity tricks)
const TYPE_HEX: Record<NotifDisplay, string> = {
  stock_critical: "hsl(4 72% 52%)",
  stock_low:      "hsl(36 88% 52%)",
  new_sale:       "hsl(152 38% 38%)",
  new_client:     "hsl(262 52% 52%)",
  system:         "hsl(210 70% 52%)",
};

const ACTION_URL_MAP: Record<NotifDisplay, string> = {
  stock_critical: "/stock",
  stock_low:      "/stock",
  new_sale:       "/invoices",
  new_client:     "/clients",
  system:         "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveType(notification_type: string): NotifDisplay {
  const valid: NotifDisplay[] = ['stock_critical', 'stock_low', 'new_sale', 'new_client', 'system'];
  return valid.includes(notification_type as NotifDisplay)
    ? (notification_type as NotifDisplay)
    : 'system';
}

function relativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "Date inconnue";
  const now = new Date();
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Date inconnue";
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function filterByTab(notifications: Notification[], tab: TabKey): Notification[] {
  switch (tab) {
    case "non_lues":
      return notifications.filter((n) => !n.is_read);
    case "stock":
      return notifications.filter(
        (n) => n.notification_type === "stock_critical" || n.notification_type === "stock_low"
      );
    case "ventes":
      return notifications.filter(
        (n) => n.notification_type === "new_sale" || n.notification_type === "new_client"
      );
    case "systeme":
      return notifications.filter(
        (n) => n.notification_type === "system"
      );
    default:
      return notifications;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/vendeur") ? "/vendeur" : "";
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  // Les admins voient le pool complet des notifications métier (pas seulement
  // celles dont ils sont destinataires) — sinon un admin sans notif propre voit vide.
  const isAdmin = currentUser?.role === "admin";

  const [activeTab, setActiveTab] = useState<TabKey>("toutes");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [tabVisible, setTabVisible] = useState(true);
  const [prevUnreadCount, setPrevUnreadCount] = useState<number | null>(null);
  const [badgeScale, setBadgeScale] = useState(false);

  // ── Queries & mutations ────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications", isAdmin],
    queryFn: () => notificationService.getAll(isAdmin ? { all: true } : undefined),
    refetchInterval: 60_000,
  });

  const notifications: Notification[] = data?.results ?? [];

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast({ title: "Impossible de marquer comme lu", variant: "destructive" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Toutes les notifications marquées comme lues." });
    },
    onError: () => {
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast({ title: "Impossible de supprimer la notification", variant: "destructive" });
    },
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const stockAlertCount = notifications.filter(
    (n) => n.notification_type === "stock_critical" || n.notification_type === "stock_low"
  ).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const salesTodayCount = notifications.filter(
    (n) => n.notification_type === "new_sale" && n.created_at?.startsWith(todayStr)
  ).length;

  const tabCounts: Record<TabKey, number> = {
    toutes:   notifications.length,
    non_lues: unreadCount,
    stock: notifications.filter(
      (n) => n.notification_type === "stock_critical" || n.notification_type === "stock_low"
    ).length,
    ventes: notifications.filter(
      (n) => n.notification_type === "new_sale" || n.notification_type === "new_client"
    ).length,
    systeme: notifications.filter(
      (n) => n.notification_type === "system"
    ).length,
  };

  const displayed = filterByTab(notifications, activeTab);

  // ── Animation effects ───────────────────────────────────────────────────────

  // Tab switch fade
  function handleTabSwitch(tab: TabKey) {
    if (tab === activeTab) return;
    setTabVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setTabVisible(true);
    }, 150);
  }

  // Unread badge scale-pop when count changes
  useEffect(() => {
    if (prevUnreadCount !== null && prevUnreadCount !== unreadCount) {
      setBadgeScale(true);
      const timer = setTimeout(() => setBadgeScale(false), 200);
      setPrevUnreadCount(unreadCount);
      return () => clearTimeout(timer);
    }
    setPrevUnreadCount(unreadCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleMarkAllRead() {
    if (markAllReadMutation.isPending) return;
    markAllReadMutation.mutate();
  }

  function handleNotifClick(notif: Notification) {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    const display = resolveType(notif.notification_type);
    const url = ACTION_URL_MAP[display];
    if (url) {
      navigate(`${basePath}${url}`);
    }
  }

  function handleDelete(notif: Notification, e: React.MouseEvent) {
    e.stopPropagation();
    setRemovingId(notif.id);
    // Backend requires notification to be read before deletion.
    // Mark as read first if needed, then delete after the exit animation.
    const doDelete = () => {
      setTimeout(() => {
        setRemovingId(null);
        deleteMutation.mutate(notif.id);
      }, 300);
    };
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id, { onSettled: doDelete });
    } else {
      doDelete();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title="Notifications"
        subtitle="Alertes et activité récente"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Page header premium ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-1 h-6 rounded-full flex-shrink-0"
                  style={{ background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))" }}
                />
                <h1
                  className="text-2xl font-extrabold font-heading"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{
                      background: "hsl(22 72% 48%)",
                      transition: "transform 0.2s ease",
                      transform: badgeScale ? "scale(1.2)" : "scale(1)",
                      display: "inline-block",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground ml-3">
                Alertes stock, ventes et activité système en temps réel
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-2 text-xs font-semibold transition-all"
                style={{
                  padding: "7px 14px",
                  borderRadius: "10px",
                  background: "transparent",
                  color: "hsl(22 72% 48%)",
                  border: "1px solid hsl(22 72% 48% / 0.3)",
                  cursor: markAllReadMutation.isPending ? "not-allowed" : "pointer",
                  opacity: markAllReadMutation.isPending ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!markAllReadMutation.isPending) {
                    e.currentTarget.style.background = "hsl(22 72% 48% / 0.08)";
                    e.currentTarget.style.borderColor = "hsl(22 72% 48% / 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "hsl(22 72% 48% / 0.3)";
                }}
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Tout marquer comme lu
              </button>
            )}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total",
              value: String(notifications.length),
              icon: Bell,
              numericValue: notifications.length,
              topColor: "hsl(210 70% 52%)",
            },
            {
              label: "Non lues",
              value: String(unreadCount),
              changeType: unreadCount > 0 ? "negative" as const : "positive" as const,
              change: unreadCount > 0 ? "Action requise" : "Tout à jour",
              icon: Bell,
              numericValue: unreadCount,
              topColor: unreadCount > 0 ? "hsl(4 72% 52%)" : "hsl(152 38% 38%)",
            },
            {
              label: "Alertes stock",
              value: String(stockAlertCount),
              changeType: stockAlertCount > 0 ? "negative" as const : "positive" as const,
              change: stockAlertCount > 0 ? "Vérifier le stock" : "Aucune alerte",
              icon: AlertTriangle,
              numericValue: stockAlertCount,
              topColor: stockAlertCount > 0 ? "hsl(36 88% 52%)" : "hsl(152 38% 38%)",
            },
            {
              label: "Ventes aujourd'hui",
              value: String(salesTodayCount),
              changeType: "positive" as const,
              change: "Ventes du jour",
              icon: ShoppingCart,
              numericValue: salesTodayCount,
              topColor: "hsl(152 38% 38%)",
            },
          ].map((card, index) => (
            <div
              key={card.label}
              style={{
                opacity: 0,
                animation: "slideInLeft 0.3s ease forwards",
                animationDelay: `${index * 70}ms`,
                borderTop: `3px solid ${card.topColor}`,
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <StatCard
                label={card.label}
                value={card.value}
                changeType={card.changeType}
                change={card.change}
                icon={card.icon}
                animated
                numericValue={card.numericValue}
                animationDuration={800}
              />
            </div>
          ))}
        </div>

        {/* ── Panneau principal ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border) / 0.5)",
            borderRadius: "16px",
            boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
          }}
        >
          {/* Tabs + badge non-lues */}
          <div className="flex flex-col gap-2 px-3 pt-3 pb-3 border-b sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 flex-wrap">
              {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabSwitch(tab)}
                  className="relative flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 flex-shrink-0"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "100px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: activeTab === tab
                      ? "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))"
                      : "transparent",
                    color: activeTab === tab ? "white" : "hsl(var(--muted-foreground))",
                    boxShadow: activeTab === tab
                      ? "0 2px 8px hsl(22 72% 48% / 0.35)"
                      : "none",
                    border: activeTab === tab
                      ? "none"
                      : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (tab !== activeTab) {
                      e.currentTarget.style.background = "hsl(var(--muted) / 0.5)";
                      e.currentTarget.style.color = "hsl(var(--foreground))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== activeTab) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                    }
                  }}
                >
                  {TAB_LABELS[tab]}
                  {tabCounts[tab] > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "18px",
                        height: "18px",
                        padding: "0 4px",
                        borderRadius: "100px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: activeTab === tab
                          ? "rgba(255,255,255,0.25)"
                          : tab === "non_lues" && tabCounts[tab] > 0
                          ? "hsl(var(--destructive))"
                          : "hsl(var(--muted))",
                        color: activeTab === tab
                          ? "white"
                          : tab === "non_lues" && tabCounts[tab] > 0
                          ? "white"
                          : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {tabCounts[tab]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <span className="self-start sm:self-auto sm:shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-soft inline-block" />
                {unreadCount} non {unreadCount > 1 ? "lues" : "lue"}
              </span>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-body">Chargement des notifications…</span>
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
              <AlertTriangle className="w-8 h-8 opacity-60" />
              <p className="text-sm">Impossible de charger les notifications.</p>
            </div>
          )}

          {/* Liste */}
          {!isLoading && !isError && (
            <div
              style={{
                opacity: tabVisible ? 1 : 0,
                transition: "opacity 0.15s ease",
                padding: "6px 0",
              }}
            >
              {displayed.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "hsl(var(--muted))" }}
                  >
                    <BellOff className="w-7 h-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Aucune notification dans cette catégorie
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Les nouvelles alertes apparaîtront ici
                  </p>
                </div>
              ) : (
                displayed.map((notif, index) => {
                  const resolvedType = resolveType(notif.notification_type);
                  const TypeIcon = TYPE_ICON[resolvedType] ?? Settings;
                  const typeColor = TYPE_HEX[resolvedType] ?? "hsl(22 72% 48%)";

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        opacity: 0,
                        animation: "slideInLeft 0.3s ease forwards",
                        animationDelay: `${index * 50}ms`,
                        background: !notif.is_read ? `hsl(22 72% 48% / 0.04)` : "hsl(var(--card))",
                        borderLeft: `3px solid ${!notif.is_read ? typeColor : "transparent"}`,
                        borderRadius: "16px",
                        margin: "6px 10px",
                        border: `1px solid hsl(var(--border) / 0.5)`,
                        borderLeftWidth: "3px",
                        borderLeftColor: !notif.is_read ? typeColor : "transparent",
                        transition: "border-left-color 0.3s ease, background 0.3s ease, opacity 0.3s ease, transform 0.3s ease, box-shadow 0.2s ease",
                        cursor: "pointer",
                      }}
                      className={cn(
                        "group relative flex items-start gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4",
                        "overflow-hidden",
                        removingId === notif.id ? "opacity-0 scale-95" : "",
                        notif.is_read ? "opacity-80 hover:opacity-100" : ""
                      )}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "hsl(22 72% 48% / 0.04)";
                        e.currentTarget.style.boxShadow = "0 2px 10px hsl(22 30% 15% / 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = !notif.is_read ? "hsl(22 72% 48% / 0.04)" : "hsl(var(--card))";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* Icône type avec couleur */}
                      <div
                        className="flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          width: "36px",
                          height: "36px",
                          minWidth: "36px",
                          borderRadius: "10px",
                          padding: "8px",
                          background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${typeColor} 20%, transparent)`,
                        }}
                      >
                        <TypeIcon className="w-4 h-4" style={{ color: typeColor }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm leading-snug font-heading flex-1 min-w-0",
                              notif.is_read
                                ? "font-normal text-foreground/80"
                                : "font-semibold text-foreground"
                            )}
                          >
                            {notif.title}
                          </p>
                          {/* Dismiss + dot regroupés en haut à droite */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                            {!notif.is_read && (
                              <div
                                className="w-2 h-2 rounded-full animate-pulse-soft"
                                style={{ background: typeColor }}
                              />
                            )}
                            <button
                              onClick={(e) => handleDelete(notif, e)}
                              className="p-1.5 rounded-md opacity-40 hover:opacity-100 active:opacity-100 hover:bg-muted active:bg-muted transition-all duration-150 touch-manipulation"
                              aria-label="Supprimer"
                            >
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-body leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="mt-1.5 inline-block font-mono text-[10px] text-muted-foreground/70 tracking-tight">
                          {relativeTime(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
