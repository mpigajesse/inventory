import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Search,
  Menu,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  UserCircle,
  AlertTriangle,
  ShoppingCart,
  UserPlus,
  AlertOctagon,
  Package,
  FileText,
  UserCog,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  notificationService,
  type Notification,
} from "@/services/notificationService";

// ─── Route labels ─────────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/products": "Produits",
  "/stock": "Stock",
  "/pos": "Point de vente",
  "/invoices": "Factures",
  "/clients": "Clients",
  "/users": "Utilisateurs",
  "/reports": "Rapports",
  "/settings": "Paramètres",
  "/notifications": "Notifications",
  "/profile": "Mon profil",
  "/barcodes": "Codes-barres",
  "/suppliers": "Fournisseurs",
  "/categories": "Catégories",
  "/admin": "Administration",
  "/admin/overview": "Vue d'ensemble",
};

interface BreadcrumbSegment {
  label: string;
  path: string;
}

function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const parts = pathname.split("/").filter(Boolean);
  const segments: BreadcrumbSegment[] = [];

  let cumPath = "";
  for (const part of parts) {
    cumPath += `/${part}`;
    const label = ROUTE_LABELS[cumPath];
    segments.push({
      label: label ?? part.charAt(0).toUpperCase() + part.slice(1),
      path: cumPath,
    });
  }

  return segments;
}

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Notification helpers ─────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)}h`;
  return `il y a ${Math.floor(diff / 86_400_000)} jour(s)`;
}

type NotifIconEntry = {
  Icon: React.ElementType;
  colorClass: string;
};

function resolveNotifStyle(type: string): NotifIconEntry {
  switch (type) {
    case "sale":
      return { Icon: ShoppingCart, colorClass: "bg-success/10 text-success" };
    case "low_stock":
      return { Icon: AlertTriangle, colorClass: "bg-amber-500/10 text-amber-600" };
    case "stock_critique":
      return { Icon: AlertOctagon, colorClass: "bg-destructive/10 text-destructive" };
    case "new_client":
    case "user":
      return { Icon: UserPlus, colorClass: "bg-primary/10 text-primary" };
    case "invoice":
      return { Icon: FileText, colorClass: "bg-primary/10 text-primary" };
    case "stock":
      return { Icon: Package, colorClass: "bg-amber-500/10 text-amber-600" };
    case "utilisateur":
      return { Icon: UserCog, colorClass: "text-purple-500 bg-purple-500/10" };
    default:
      return { Icon: Settings, colorClass: "bg-muted text-muted-foreground" };
  }
}

// ─── TopbarProps ──────────────────────────────────────────────────────────────

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  notificationCount?: number;
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar({
  title,
  subtitle,
  onMenuClick,
  onSearchClick,
}: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const queryClient = useQueryClient();

  const profilePath =
    currentUser?.role === "vendeur" ? "/vendeur/profile" : "/profile";
  const settingsPath =
    currentUser?.role === "vendeur" ? "/vendeur/settings" : "/settings";
  const segments = buildBreadcrumbs(location.pathname);
  const showBreadcrumbs = segments.length > 1;

  // ── User menu state ────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── Notification dropdown state ────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // ── Unread count query (polled every 30 s) ─────────────────────────────────
  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30_000,
    enabled: !!currentUser,
  });
  const unreadCount = unreadData?.count ?? 0;

  // ── Recent notifications query (for dropdown preview) ─────────────────────
  const { data: allData, isLoading: notifsLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getAll(),
    enabled: notifOpen && !!currentUser,
    staleTime: 20_000,
  });
  const recentNotifs: Notification[] = (allData?.results ?? []).slice(0, 5);

  // ── Mark-read mutation ─────────────────────────────────────────────────────
  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // ── Close on outside click / Escape ───────────────────────────────────────
  useEffect(() => {
    if (!menuOpen && !notifOpen) return;

    const handleClick = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen, notifOpen]);

  const handleLogout = async (): Promise<void> => {
    setMenuOpen(false);
    await logout();
    navigate("/auth/login");
  };

  const initials = getInitials(currentUser?.name);
  const roleLabel =
    currentUser?.role === "admin" ? "Administrateur" : "Vendeur";

  return (
    <header
      className="shrink-0 sticky top-0 z-20"
      style={{
        background: "hsl(var(--topbar-bg))",
        borderBottom: "1px solid hsl(var(--topbar-border))",
        boxShadow: "0 1px 2px hsl(var(--shadow-color-warm) / 0.04)",
      }}
    >
      {/* Main topbar row */}
      <div className="h-16 flex items-center justify-between px-3 md:px-6 gap-3">
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className={cn(
                "md:hidden shrink-0 flex items-center justify-center w-11 h-11 -ml-1 rounded-md",
                "hover:bg-secondary transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              )}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-foreground" strokeWidth={2.25} />
            </button>
          )}

          <div className="min-w-0">
            <h1
              className="text-[17px] md:text-[18px] font-semibold text-foreground leading-tight truncate"
              style={{ letterSpacing: "-0.015em" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[12px] text-muted-foreground hidden sm:block truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: search, notifications, user menu */}
        <div className="flex items-center gap-1.5">
          {/* Search trigger — pill on desktop, icon-only on mobile */}
          <button
            type="button"
            onClick={onSearchClick}
            className={cn(
              "hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-md",
              "text-[12px] text-muted-foreground border border-[hsl(var(--border))]",
              "bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--muted))] hover:text-foreground",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            )}
            aria-label="Recherche rapide (Ctrl+K)"
            title="Recherche rapide (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Rechercher…</span>
            <kbd
              className="hidden lg:inline-flex items-center justify-center h-5 px-1.5 rounded border text-[10px] font-semibold ml-2"
              style={{
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--muted-foreground))",
                background: "hsl(var(--background))",
              }}
            >
              Ctrl K
            </kbd>
          </button>

          {/* Mobile-only search icon */}
          <button
            type="button"
            onClick={onSearchClick}
            className="sm:hidden flex items-center justify-center w-11 h-11 rounded-md hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            aria-label="Recherche"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* ── Notifications dropdown ───────────────────────────────────── */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative flex items-center justify-center w-11 h-11 rounded-md hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              aria-label={`Notifications (${unreadCount} non lues)`}
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
            >
              <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ring-2"
                  style={{
                    background: "hsl(var(--destructive))",
                    color: "hsl(var(--destructive-foreground))",
                    ringColor: "hsl(var(--topbar-bg))",
                    boxShadow: "0 0 0 2px hsl(var(--topbar-bg))",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications récentes"
                className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1rem)] rounded-xl overflow-hidden z-30"
                style={{
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.4)" }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-[13px] font-semibold text-foreground">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                        style={{
                          background: "hsl(var(--destructive))",
                          color: "hsl(var(--destructive-foreground))",
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Tout voir
                  </Link>
                </div>

                {/* Body */}
                <div className="max-h-[340px] overflow-y-auto">
                  {notifsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[12px]">Chargement…</span>
                    </div>
                  ) : recentNotifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                      <Bell className="w-6 h-6 opacity-30" />
                      <span className="text-[12px]">Aucune notification</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {recentNotifs.map((notif) => {
                        const { Icon, colorClass } = resolveNotifStyle(notif.notification_type);
                        return (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => {
                              if (!notif.is_read) {
                                markRead.mutate(notif.id);
                              }
                              setNotifOpen(false);
                              navigate("/notifications");
                            }}
                            className={cn(
                              "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
                              notif.is_read
                                ? "opacity-70 hover:bg-muted/40"
                                : "bg-primary/[0.04] hover:bg-primary/[0.08]"
                            )}
                          >
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                colorClass
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-[12px] leading-snug truncate",
                                  notif.is_read ? "font-normal text-foreground/80" : "font-semibold text-foreground"
                                )}
                              >
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-muted-foreground/60 mt-0.5 inline-block">
                                {timeAgo(notif.created_at)}
                              </span>
                            </div>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {unreadCount > 0 && (
                  <div
                    className="px-4 py-2.5"
                    style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.2)" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!markAllRead.isPending) {
                          markAllRead.mutate();
                        }
                      }}
                      disabled={markAllRead.isPending}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {markAllRead.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      Tout marquer comme lu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vertical divider */}
          <span
            className="hidden sm:block w-px h-6 mx-1"
            style={{ background: "hsl(var(--border))" }}
            aria-hidden="true"
          />

          {/* User dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 h-10 pl-1 pr-2 rounded-full",
                "hover:bg-secondary transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              )}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Menu utilisateur"
            >
              <span
                className="flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold text-white shrink-0"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow:
                    "0 1px 2px hsl(var(--primary) / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.2)",
                }}
                aria-hidden="true"
              >
                {initials}
              </span>
              <span className="hidden md:flex flex-col items-start leading-tight pr-1">
                <span className="text-[12px] font-semibold text-foreground max-w-[120px] truncate">
                  {currentUser?.name ?? "Utilisateur"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-lg overflow-hidden z-30"
                style={{
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{
                    borderBottom: "1px solid hsl(var(--border))",
                    background: "hsl(var(--muted) / 0.4)",
                  }}
                >
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full text-[13px] font-bold text-white shrink-0"
                    style={{ background: "var(--gradient-primary)" }}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">
                      {currentUser?.name ?? "Utilisateur"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {currentUser?.email ?? roleLabel}
                    </p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <DropdownItem
                    icon={UserCircle}
                    label="Mon profil"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(profilePath);
                    }}
                  />
                  <DropdownItem
                    icon={Settings}
                    label="Paramètres"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(settingsPath);
                    }}
                  />
                </div>

                <div
                  className="py-1"
                  style={{ borderTop: "1px solid hsl(var(--border))" }}
                >
                  <DropdownItem
                    icon={LogOut}
                    label="Déconnexion"
                    onClick={handleLogout}
                    variant="destructive"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <div
          className="flex items-center gap-1 px-3 md:px-6 pb-2.5 text-[11px] overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Home className="w-3 h-3" />
            <span>Accueil</span>
          </Link>

          {segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1;
            return (
              <span key={seg.path} className="flex items-center gap-1 shrink-0">
                <ChevronRight
                  className="w-3 h-3 shrink-0"
                  style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                />
                {isLast ? (
                  <span className="text-foreground font-medium">{seg.label}</span>
                ) : (
                  <Link
                    to={seg.path}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {seg.label}
                  </Link>
                )}
              </span>
            );
          })}
        </div>
      )}
    </header>
  );
}

// ─── DropdownItem ─────────────────────────────────────────────────────────────

interface DropdownItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}

function DropdownItem({
  icon: Icon,
  label,
  onClick,
  variant = "default",
}: DropdownItemProps) {
  const isDestructive = variant === "destructive";
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors text-left",
        "focus-visible:outline-none",
        isDestructive
          ? "text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)]"
          : "text-foreground hover:bg-[hsl(var(--muted))]"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
