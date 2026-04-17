import { useNavigate, useOutletContext } from "react-router-dom";
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
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

// UI-side display categories (mapped from backend NotificationType)
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

const TYPE_ICON: Record<NotifDisplay, React.ComponentType<{ className?: string }>> = {
  stock_critical: AlertTriangle,
  stock_low: Package,
  new_sale: ShoppingCart,
  new_client: UserCog,
  system: Settings,
};

const TYPE_COLOR: Record<NotifDisplay, string> = {
  stock_critical: "text-destructive bg-destructive/10",
  stock_low: "text-warning bg-warning/10",
  new_sale: "text-success bg-success/10",
  new_client: "text-purple-500 bg-purple-500/10",
  system: "text-muted-foreground bg-muted",
};

const ACTION_URL_MAP: Record<NotifDisplay, string> = {
  stock_critical: "/stock",
  stock_low: "/stock",
  new_sale: "/invoices",
  new_client: "/clients",
  system: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveType(notification_type: string): NotifDisplay {
  const valid: NotifDisplay[] = ['stock_critical', 'stock_low', 'new_sale', 'new_client', 'system'];
  return valid.includes(notification_type as NotifDisplay)
    ? (notification_type as NotifDisplay)
    : 'system';
}

function relativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
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
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("toutes");
  const [removingId, setRemovingId] = useState<number | null>(null);

  // ── Queries & mutations ────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
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

  // ── Derived values ─────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const stockAlertCount = notifications.filter(
    (n) => n.notification_type === "stock_critical" || n.notification_type === "stock_low"
  ).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const salesTodayCount = notifications.filter(
    (n) => n.notification_type === "new_sale" && n.created_at.startsWith(todayStr)
  ).length;

  const tabCounts: Record<TabKey, number> = {
    toutes: notifications.length,
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
      navigate(url);
    }
  }

  function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setRemovingId(id);
    setTimeout(() => {
      setRemovingId(null);
      markReadMutation.mutate(id);
    }, 300);
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
        <div className="page-header-premium flex-row items-center justify-between gap-4 flex flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="page-header-eyebrow">Centre de notifications</p>
              <h1 className="page-header-title">Notifications</h1>
              <p className="page-header-subtitle">
                Alertes stock, ventes et activité système en temps réel
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4 text-primary" />
              )}
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total"
            value={String(notifications.length)}
            icon={Bell}
            animated
            numericValue={notifications.length}
            animationDuration={800}
          />
          <StatCard
            label="Non lues"
            value={String(unreadCount)}
            changeType={unreadCount > 0 ? "negative" : "positive"}
            change={unreadCount > 0 ? "Action requise" : "Tout à jour"}
            icon={Bell}
            animated
            numericValue={unreadCount}
            animationDuration={800}
          />
          <StatCard
            label="Alertes stock"
            value={String(stockAlertCount)}
            changeType={stockAlertCount > 0 ? "negative" : "positive"}
            change={stockAlertCount > 0 ? "Vérifier le stock" : "Aucune alerte"}
            icon={AlertTriangle}
            animated
            numericValue={stockAlertCount}
            animationDuration={800}
          />
          <StatCard
            label="Ventes aujourd'hui"
            value={String(salesTodayCount)}
            changeType="positive"
            change="Ventes du jour"
            icon={ShoppingCart}
            animated
            numericValue={salesTodayCount}
            animationDuration={800}
          />
        </div>

        {/* ── Panneau principal ── */}
        <div className="card-premium">

          {/* Tabs + badge non-lues */}
          <div className="flex items-center justify-between px-1 pt-1 border-b overflow-x-auto gap-2">
            <div className="flex gap-0.5">
              {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-all duration-200",
                    activeTab === tab
                      ? "text-primary bg-primary/5 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {TAB_LABELS[tab]}
                  {tabCounts[tab] > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                        activeTab === tab
                          ? "bg-primary text-primary-foreground"
                          : tab === "non_lues" && tabCounts[tab] > 0
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tabCounts[tab]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <span className="shrink-0 mr-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-semibold">
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
            <div className="divide-y divide-border">
              {displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <BellOff className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Aucune notification dans cette catégorie</p>
                  <p className="text-xs opacity-60">Les nouvelles alertes apparaîtront ici</p>
                </div>
              ) : (
                displayed.map((notif, index) => {
                  const resolvedType = resolveType(notif.notification_type);
                  const Icon = TYPE_ICON[resolvedType] ?? Settings;
                  const colorClass = TYPE_COLOR[resolvedType] ?? TYPE_COLOR["systeme"];

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      style={{ animationDelay: `${index * 30}ms` }}
                      className={cn(
                        "group relative flex items-start gap-4 px-5 py-4 cursor-pointer",
                        "transition-all duration-200 overflow-hidden animate-fade-scale",
                        notif.is_read
                          ? "opacity-70 hover:opacity-100 hover:bg-muted/30"
                          : "border-l-4 border-primary bg-primary/[0.04] hover:bg-primary/[0.07]",
                        removingId === notif.id && "opacity-0 scale-95 max-h-0 py-0"
                      )}
                    >
                      {/* Unread pulse dot */}
                      {!notif.is_read && (
                        <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                      )}

                      {/* Icon pill */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          colorClass
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p
                          className={cn(
                            "text-sm leading-snug font-heading",
                            notif.is_read
                              ? "font-normal text-foreground/80"
                              : "font-semibold text-foreground"
                          )}
                        >
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="mt-1.5 inline-block font-mono text-[10px] text-muted-foreground/70 tracking-tight">
                          {relativeTime(notif.created_at)}
                        </span>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all duration-150"
                        aria-label="Supprimer"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
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
