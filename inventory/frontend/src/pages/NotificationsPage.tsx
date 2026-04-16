import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

type NotifType = "stock_critique" | "stock_bas" | "vente" | "facture" | "systeme" | "utilisateur";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    type: "stock_critique",
    title: "Stock critique — Lait Nido 400g",
    message: "Il ne reste que 2 unités. Réapprovisionnement urgent nécessaire.",
    timestamp: "2026-04-16T08:15:00",
    read: false,
    actionUrl: "/stock",
  },
  {
    id: 2,
    type: "vente",
    title: "Vente enregistrée",
    message: "Vente N°VNT-024 validée pour 45 000 FCFA (3 articles).",
    timestamp: "2026-04-16T09:32:00",
    read: false,
    actionUrl: "/invoices",
  },
  {
    id: 3,
    type: "stock_critique",
    title: "Stock critique — Riz Uncle Ben's 5kg",
    message: "Il ne reste que 1 unité. Rupture imminente.",
    timestamp: "2026-04-16T09:50:00",
    read: false,
    actionUrl: "/stock",
  },
  {
    id: 4,
    type: "utilisateur",
    title: "Nouvel utilisateur créé",
    message: "Le compte caissier 'Marie Obiang' a été créé avec succès.",
    timestamp: "2026-04-16T10:05:00",
    read: false,
    actionUrl: "/users",
  },
  {
    id: 5,
    type: "facture",
    title: "Facture impayée — Client Épicerie Centrale",
    message: "La facture FAC-0187 de 128 500 FCFA est en retard de 7 jours.",
    timestamp: "2026-04-16T10:30:00",
    read: false,
    actionUrl: "/invoices",
  },
  {
    id: 6,
    type: "stock_bas",
    title: "Stock bas — Huile Dinor 1L",
    message: "Stock actuel : 5 unités (seuil minimum : 15).",
    timestamp: "2026-04-16T11:00:00",
    read: true,
    actionUrl: "/stock",
  },
  {
    id: 7,
    type: "vente",
    title: "Vente enregistrée",
    message: "Vente N°VNT-025 validée pour 12 500 FCFA (1 article).",
    timestamp: "2026-04-16T11:20:00",
    read: true,
    actionUrl: "/invoices",
  },
  {
    id: 8,
    type: "systeme",
    title: "Sauvegarde automatique effectuée",
    message: "Les données ont été sauvegardées avec succès à 11h00.",
    timestamp: "2026-04-16T11:00:00",
    read: true,
  },
  {
    id: 9,
    type: "stock_bas",
    title: "Stock bas — Savon Palmolive",
    message: "Stock actuel : 4 unités (seuil minimum : 12).",
    timestamp: "2026-04-15T17:45:00",
    read: true,
    actionUrl: "/stock",
  },
  {
    id: 10,
    type: "facture",
    title: "Facture payée — Client Supermarché Gabonais",
    message: "La facture FAC-0183 de 75 000 FCFA a été réglée.",
    timestamp: "2026-04-15T16:10:00",
    read: true,
    actionUrl: "/invoices",
  },
  {
    id: 11,
    type: "systeme",
    title: "Mise à jour disponible",
    message: "Une nouvelle version de l'application est disponible. Actualisez pour bénéficier des améliorations.",
    timestamp: "2026-04-15T14:00:00",
    read: true,
  },
  {
    id: 12,
    type: "vente",
    title: "Vente enregistrée",
    message: "Vente N°VNT-023 validée pour 78 000 FCFA (5 articles).",
    timestamp: "2026-04-15T13:08:00",
    read: true,
    actionUrl: "/invoices",
  },
  {
    id: 13,
    type: "stock_critique",
    title: "Stock critique — Farine Moulins Gabon 1kg",
    message: "Il ne reste que 3 unités. Action requise rapidement.",
    timestamp: "2026-04-15T10:55:00",
    read: true,
    actionUrl: "/stock",
  },
  {
    id: 14,
    type: "utilisateur",
    title: "Connexion suspecte détectée",
    message: "Une connexion depuis un nouvel appareil a été enregistrée pour l'admin.",
    timestamp: "2026-04-15T09:20:00",
    read: true,
    actionUrl: "/users",
  },
  {
    id: 15,
    type: "stock_bas",
    title: "Stock bas — Sucre en poudre 1kg",
    message: "Stock actuel : 8 unités (seuil minimum : 20).",
    timestamp: "2026-04-14T16:30:00",
    read: true,
    actionUrl: "/stock",
  },
  {
    id: 16,
    type: "facture",
    title: "Rappel — Facture FAC-0180 en attente",
    message: "La facture de 43 000 FCFA n'a pas encore été réglée.",
    timestamp: "2026-04-14T09:00:00",
    read: true,
    actionUrl: "/invoices",
  },
  {
    id: 17,
    type: "systeme",
    title: "Rapport journalier généré",
    message: "Le rapport du 14/04/2026 est disponible : 24 ventes, 215 000 FCFA.",
    timestamp: "2026-04-14T23:59:00",
    read: true,
  },
];

type TabKey = "toutes" | "non_lues" | "stock" | "ventes" | "systeme";

const TAB_LABELS: Record<TabKey, string> = {
  toutes: "Toutes",
  non_lues: "Non lues",
  stock: "Stock",
  ventes: "Ventes",
  systeme: "Système",
};

const TYPE_ICON: Record<NotifType, React.ComponentType<{ className?: string }>> = {
  stock_critique: AlertTriangle,
  stock_bas: Package,
  vente: ShoppingCart,
  facture: FileText,
  systeme: Settings,
  utilisateur: UserCog,
};

const TYPE_COLOR: Record<NotifType, string> = {
  stock_critique: "text-destructive bg-destructive/10",
  stock_bas: "text-warning bg-warning/10",
  vente: "text-success bg-success/10",
  facture: "text-primary bg-primary/10",
  systeme: "text-muted-foreground bg-muted",
  utilisateur: "text-purple-500 bg-purple-500/10",
};

function relativeTime(isoString: string): string {
  const now = new Date("2026-04-16T12:00:00");
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
      return notifications.filter((n) => !n.read);
    case "stock":
      return notifications.filter((n) => n.type === "stock_critique" || n.type === "stock_bas");
    case "ventes":
      return notifications.filter((n) => n.type === "vente" || n.type === "facture");
    case "systeme":
      return notifications.filter((n) => n.type === "systeme" || n.type === "utilisateur");
    default:
      return notifications;
  }
}

export default function NotificationsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<TabKey>("toutes");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const stockAlertCount = notifications.filter(
    (n) => n.type === "stock_critique" || n.type === "stock_bas"
  ).length;
  const salesTodayCount = notifications.filter(
    (n) => n.type === "vente" && n.timestamp.startsWith("2026-04-16")
  ).length;

  const tabCounts: Record<TabKey, number> = {
    toutes: notifications.length,
    non_lues: unreadCount,
    stock: notifications.filter((n) => n.type === "stock_critique" || n.type === "stock_bas").length,
    ventes: notifications.filter((n) => n.type === "vente" || n.type === "facture").length,
    systeme: notifications.filter((n) => n.type === "systeme" || n.type === "utilisateur").length,
  };

  const displayed = filterByTab(notifications, activeTab);

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemovingId(id);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setRemovingId(null);
    }, 300);
  };

  const handleNotifClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

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
            <h2 className="text-sm font-semibold">Centre de notifications</h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
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

          {/* List */}
          <div className="divide-y divide-border">
            {displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Aucune notification dans cette catégorie</p>
              </div>
            ) : (
              displayed.map((notif) => {
                const Icon = TYPE_ICON[notif.type];
                const colorClass = TYPE_COLOR[notif.type];
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      "group relative flex items-start gap-4 px-5 py-4 cursor-pointer transition-all duration-300 overflow-hidden",
                      notif.read
                        ? "hover:bg-muted/40"
                        : "bg-primary/[0.03] hover:bg-primary/[0.06]",
                      removingId === notif.id && "opacity-0 scale-95 max-h-0 py-0"
                    )}
                  >
                    {/* Unread dot */}
                    <span
                      className={cn(
                        "absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-300",
                        notif.read ? "opacity-0 scale-0" : "opacity-100 scale-100"
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
                          notif.read ? "font-normal text-foreground" : "font-semibold text-foreground"
                        )}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {/* Timestamp + delete */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {relativeTime(notif.timestamp)}
                      </span>
                      <button
                        onClick={(e) => deleteNotification(notif.id, e)}
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
        </div>
      </div>
    </>
  );
}
