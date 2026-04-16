import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  AlertTriangle,
  Package,
  FileText,
  Settings,
  UserCog,
  X,
  CheckCheck,
  ShoppingCart,
  Loader2,
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

type NotifType = "stock_critique" | "stock_bas" | "vente" | "facture" | "systeme" | "utilisateur";
type TabKey = "toutes" | "non_lues" | "stock" | "ventes" | "systeme";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<TabKey, string> = {
  toutes: "Toutes",
  non_lues: "Non lues",
  stock: "Stock",
  ventes: "Ventes",
  systeme: "Système",
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  stock_critique: AlertTriangle,
  stock_bas: Package,
  vente: ShoppingCart,
  facture: FileText,
  systeme: Settings,
  utilisateur: UserCog,
};

const TYPE_COLOR: Record<string, string> = {
  stock_critique: "text-destructive bg-destructive/10",
  stock_bas: "text-warning bg-warning/10",
  vente: "text-success bg-success/10",
  facture: "text-primary bg-primary/10",
  systeme: "text-muted-foreground bg-muted",
  utilisateur: "text-purple-500 bg-purple-500/10",
};

// Map API notification_type to our internal notif type for icon/color resolution
const NOTIF_TYPE_MAP: Record<string, NotifType> = {
  stock_critique: "stock_critique",
  low_stock: "stock_bas",
  sale: "vente",
  invoice: "facture",
  system: "systeme",
  user: "utilisateur",
};

// Map API notification_type to action URL
const ACTION_URL_MAP: Record<string, string> = {
  stock_critique: "/stock",
  low_stock: "/stock",
  sale: "/invoices",
  invoice: "/invoices",
  user: "/users",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveType(notification_type: string): NotifType {
  return NOTIF_TYPE_MAP[notification_type] ?? "systeme";
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
        (n) => n.notification_type === "stock_critique" || n.notification_type === "low_stock"
      );
    case "ventes":
      return notifications.filter(
        (n) => n.notification_type === "sale" || n.notification_type === "invoice"
      );
    case "systeme":
      return notifications.filter(
        (n) => n.notification_type === "system" || n.notification_type === "user"
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
    refetchInterval: 60_000, // refresh every minute
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
    (n) => n.notification_type === "stock_critique" || n.notification_type === "low_stock"
  ).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const salesTodayCount = notifications.filter(
    (n) => n.notification_type === "sale" && n.created_at.startsWith(todayStr)
  ).length;

  const tabCounts: Record<TabKey, number> = {
    toutes: notifications.length,
    non_lues: unreadCount,
    stock: notifications.filter(
      (n) => n.notification_type === "stock_critique" || n.notification_type === "low_stock"
    ).length,
    ventes: notifications.filter(
      (n) => n.notification_type === "sale" || n.notification_type === "invoice"
    ).length,
    systeme: notifications.filter(
      (n) => n.notification_type === "system" || n.notification_type === "user"
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
    const url = ACTION_URL_MAP[notif.notification_type];
    if (url) {
      navigate(url);
    }
  }

  function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setRemovingId(id);
    // Optimistically hide then invalidate — no dedicated delete endpoint assumed.
    // If the API provides one, call it here.
    setTimeout(() => {
      setRemovingId(null);
      // mark read as a proxy for "dismiss"
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
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

        {/* Card */}
        <div className="bg-card rounded-lg border">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Centre de notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
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

          {/* Tabs */}
          <div className="flex gap-1 px-4 pt-3 pb-0 border-b overflow-x-auto">
            {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md whitespace-nowrap transition-colors border-b-2",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {TAB_LABELS[tab]}
                {tabCounts[tab] > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold",
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

          {/* Loading / error */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Chargement des notifications…</span>
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex items-center justify-center py-16 text-destructive text-sm">
              Impossible de charger les notifications.
            </div>
          )}

          {/* List */}
          {!isLoading && !isError && (
            <div className="divide-y divide-border">
              {displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Bell className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Aucune notification dans cette catégorie</p>
                </div>
              ) : (
                displayed.map((notif) => {
                  const resolvedType = resolveType(notif.notification_type);
                  const Icon = TYPE_ICON[resolvedType] ?? Settings;
                  const colorClass = TYPE_COLOR[resolvedType] ?? TYPE_COLOR["systeme"];

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={cn(
                        "group relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-all duration-300 overflow-hidden",
                        notif.is_read
                          ? "hover:bg-muted/40"
                          : "bg-primary/[0.03] hover:bg-primary/[0.06]",
                        removingId === notif.id && "opacity-0 scale-95 max-h-0 py-0"
                      )}
                    >
                      {/* Unread dot */}
                      <span
                        className={cn(
                          "absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300",
                          notif.is_read ? "opacity-0 scale-0" : "opacity-100 scale-100"
                        )}
                      />

                      {/* Icon */}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          colorClass
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            notif.is_read
                              ? "font-normal text-foreground"
                              : "font-semibold text-foreground"
                          )}
                        >
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>

                      {/* Timestamp + dismiss */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {relativeTime(notif.created_at)}
                        </span>
                        <button
                          onClick={(e) => handleDelete(notif.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                          aria-label="Supprimer"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
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
