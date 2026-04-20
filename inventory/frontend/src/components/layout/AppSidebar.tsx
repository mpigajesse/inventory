import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  FileText,
  Users,
  UserCog,
  BarChart3,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  X,
  Bell,
  Truck,
  QrCode,
  ShieldCheck,
  Tag,
  Store,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roleLabel";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { useNotificationStore } from "@/stores/notificationStore";
import { useEffect, useState } from "react";

interface NavItemDef {
  label: string;
  path: string;
  icon: React.ElementType;
  /** Permission required to see this item. Omit = visible to all roles. */
  permission?: Permission;
}

interface NavGroupDef {
  id: string;
  label: string;
  items: NavItemDef[];
}

/**
 * Static navigation definition — permissions are declared per item and
 * evaluated at render time via usePermissions so the list stays declarative.
 *
 * Groups follow the user's mental model:
 *   1. Daily operations (POS, dashboard)
 *   2. Catalogue & stock  (admin-only)
 *   3. Relations          (invoices + clients for everyone; suppliers admin-only)
 *   4. Administration     (admin-only)
 */
const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "operations",
    label: "Opérations",
    items: [
      { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
      { label: "Point de vente", path: "/pos", icon: ShoppingCart },
      // Notifications badge is injected dynamically from the store (see below)
      { label: "Notifications", path: "/notifications", icon: Bell },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue & stock",
    items: [
      { label: "Produits", path: "/products", icon: Package, permission: "manage_products" },
      { label: "Catégories", path: "/categories", icon: Tag, permission: "manage_products" },
      { label: "Codes-barres", path: "/barcodes", icon: QrCode, permission: "view_barcodes" },
      { label: "Stock", path: "/stock", icon: Warehouse, permission: "manage_stock" },
    ],
  },
  {
    id: "relations",
    label: "Relations",
    items: [
      { label: "Factures", path: "/invoices", icon: FileText, permission: "view_invoices" },
      { label: "Clients", path: "/clients", icon: Users, permission: "manage_clients" },
      { label: "Fournisseurs", path: "/suppliers", icon: Truck, permission: "manage_suppliers" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { label: "Utilisateurs", path: "/users", icon: UserCog, permission: "manage_users" },
      { label: "Surveillance vendeurs·ses", path: "/admin/vendeurs", icon: Activity, permission: "manage_users" },
      { label: "Permissions", path: "/admin/permissions", icon: ShieldCheck, permission: "manage_users" },
      { label: "Rapports", path: "/reports", icon: BarChart3, permission: "view_reports" },
      { label: "Statistiques", path: "/statistics", icon: BarChart2, permission: "view_reports" },
      { label: "Paramètres", path: "/settings", icon: Settings, permission: "manage_settings" },
      { label: "Administration", path: "/admin/overview", icon: ShieldCheck, permission: "manage_users" },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
}

/**
 * Generate initials from a user's display name (2 characters max).
 */
function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppSidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { can } = usePermissions();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Track mount state for user-area slide-in animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // collapsed only applies on desktop (md+); mobile drawer is always expanded
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const effectiveCollapsed = isDesktop && collapsed;

  const handleNavClick = (): void => {
    onMobileOpenChange(false);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate("/auth/login");
  };

  const initials = getInitials(currentUser?.name);
  const displayName = currentUser?.name ?? "Utilisateur";
  const roleLabel = getRoleLabel(currentUser?.role ?? "vendeur", currentUser?.genre);

  /**
   * Build filtered, runtime-resolved nav groups.
   * - Items with a permission are hidden when the current user cannot perform it.
   * - Groups with no visible items are removed entirely.
   * - The Notifications item gets the live unreadCount badge injected here.
   */
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !item.permission || can(item.permission))
        .map((item) => ({
          ...item,
          badge: item.path === "/notifications" ? unreadCount : undefined,
        })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => onMobileOpenChange(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden",
          "md:translate-x-0",
          collapsed ? "md:w-[64px]" : "md:w-[256px]",
          "w-[280px] max-w-[85vw]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          backgroundColor: "hsl(var(--sidebar-background))",
          backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--sidebar-primary) / 0.18) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--sidebar-ring) / 0.12) 0%, transparent 40%)",
          boxShadow: "inset -1px 0 0 hsl(var(--sidebar-border) / 0.8), 4px 0 24px hsl(0 0% 0% / 0.18)",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        aria-label="Navigation principale"
      >
        {/* ── Brand / Header ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-3 py-4 shrink-0"
          style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.08)" }}
        >
          <Link
            to="/dashboard"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 min-w-0 rounded-lg transition-opacity hover:opacity-90",
              collapsed && "md:justify-center"
            )}
            aria-label="NAOSERVICES — Retour au tableau de bord"
          >
            {/* Logo mark — copper gradient */}
            <span
              className="relative flex items-center justify-center w-9 h-9 shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                boxShadow: "0 4px 16px hsl(22 72% 48% / 0.3), 0 2px 8px -1px hsl(22 72% 48% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.2)",
                borderRadius: "16px",
              }}
            >
              <Store className="w-[18px] h-[18px] text-white" strokeWidth={2.25} />
            </span>

            {/* Wordmark — fades/slides out when collapsed on desktop; always visible in mobile drawer */}
            <span
              className={cn(
                "flex flex-col min-w-0 leading-none overflow-hidden whitespace-nowrap",
                collapsed ? "md:opacity-0 md:[max-width:0px]" : "opacity-100 [max-width:160px]"
              )}
              style={{
                opacity: undefined,
                maxWidth: collapsed ? undefined : "160px",
                transition: "opacity 0.2s ease, max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <span
                className="text-[13px] font-bold tracking-[0.18em]"
                style={{ color: "hsl(0 0% 100%)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                NAOSERVICES
              </span>
              <span
                className="text-[10px] font-medium tracking-[0.12em] mt-0.5"
                style={{ color: "hsl(0 0% 100% / 0.4)" }}
              >
                Gestion de stock
              </span>
            </span>
          </Link>

          {/* Desktop collapse toggle — always rendered, chevron rotates */}
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "hidden md:flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
              "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
            )}
            style={{ color: "hsl(0 0% 100% / 0.45)" }}
            aria-label={collapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
          >
            <ChevronLeft
              className="w-4 h-4"
              style={{
                transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            />
          </button>

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => onMobileOpenChange(false)}
            className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="Fermer le menu"
            style={{ color: "hsl(0 0% 100% / 0.55)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav
          className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: "none" }}
          aria-label="Menu"
        >
          {visibleGroups.map((group, groupIdx) => (
            <div
              key={group.id}
              className={cn(
                "transition-all duration-200",
                groupIdx > 0 && "mt-2"
              )}
            >
              {/* Group label — fades out when collapsed */}
              <p
                className="font-semibold uppercase px-3 overflow-hidden"
                style={{
                  color: "hsl(0 0% 100% / 0.3)",
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  opacity: collapsed ? 0 : 1,
                  maxHeight: collapsed ? 0 : "2rem",
                  marginBottom: collapsed ? 0 : "0.375rem",
                  marginTop: collapsed ? 0 : "0.75rem",
                  transition: "opacity 0.2s ease, max-height 0.3s ease, margin 0.3s ease",
                }}
                aria-hidden={collapsed}
              >
                {group.label}
              </p>

              {/* Collapsed divider instead of label */}
              {collapsed && groupIdx > 0 && (
                <div
                  className="hidden md:block h-px mx-3 my-2"
                  style={{ background: "hsl(0 0% 100% / 0.08)" }}
                  aria-hidden="true"
                />
              )}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    location.pathname.startsWith(item.path + "/");

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        title={collapsed ? item.label : undefined}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 h-11 rounded-lg text-[13px] font-medium overflow-hidden",
                          "transition-all duration-150 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                          collapsed ? "md:justify-center md:px-0 px-3" : "px-3",
                        )}
                        style={{
                          color: isActive
                            ? "hsl(22 72% 58%)"
                            : "hsl(28 15% 68%)",
                          background: isActive
                            ? "hsl(22 72% 48% / 0.15)"
                            : undefined,
                          transition: "background 0.15s ease, color 0.15s ease",
                          paddingLeft: collapsed
                            ? undefined
                            : isActive
                              ? "calc(0.75rem + 3px)"
                              : "0.75rem",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                            (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 100%)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = "";
                            (e.currentTarget as HTMLElement).style.color = "hsl(28 15% 68%)";
                          }
                        }}
                      >
                        {/* Active left border indicator */}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: "3px",
                              background: "hsl(22 72% 48%)",
                              borderRadius: "0 3px 3px 0",
                            }}
                          />
                        )}
                        {/* Icon */}
                        <span className="relative shrink-0 flex items-center justify-center">
                          <item.icon
                            className={collapsed ? "w-[18px] h-[18px]" : "w-[16px] h-[16px]"}
                            strokeWidth={isActive ? 2.25 : 2}
                            style={{
                              color: isActive
                                ? "hsl(22 72% 52%)"
                                : "inherit",
                            }}
                          />
                          {/* Collapsed: badge dot over icon */}
                          {item.badge !== undefined &&
                            item.badge > 0 &&
                            collapsed && (
                              <span
                                className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                                style={{
                                  background: "hsl(var(--destructive))",
                                  color: "hsl(var(--destructive-foreground))",
                                  boxShadow: "0 0 0 2px hsl(var(--sidebar-background))",
                                }}
                              >
                                {item.badge > 9 ? "9+" : item.badge}
                              </span>
                            )}
                        </span>

                        {/* Label + expanded badge */}
                        <span
                          className="flex-1 flex items-center justify-between min-w-0 overflow-hidden"
                          style={{
                            opacity: collapsed ? 0 : 1,
                            maxWidth: collapsed ? 0 : "200px",
                            transition: "opacity 0.2s ease, max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className="ml-2 shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
                              style={{
                                background: isActive
                                  ? "hsl(var(--destructive))"
                                  : "hsl(var(--destructive) / 0.9)",
                                color: "hsl(var(--destructive-foreground))",
                              }}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer: avatar + user info + logout ─────────────────────── */}
        <div
          className="shrink-0 pt-3 pb-2 px-2"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease 0.3s, transform 0.4s ease 0.3s",
          }}
        >
          {/* Gradient separator */}
          <div
            aria-hidden="true"
            style={{
              height: "1px",
              marginBottom: "12px",
              background: "linear-gradient(90deg, hsl(0 0% 100% / 0) 0%, hsl(22 72% 48% / 0.3) 50%, hsl(0 0% 100% / 0) 100%)",
            }}
          />
          {/* User info row — expanded only */}
          {!collapsed && (
            <div
              className="flex items-center gap-3 px-2 py-2 mb-1"
              style={{
                background: "hsl(0 0% 0% / 0.2)",
                borderRadius: "12px",
              }}
            >
              <span
                className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(30 82% 55%))",
                  boxShadow: "0 0 0 1px hsl(22 72% 48% / 0.3)",
                }}
                aria-hidden="true"
              >
                {initials}
                {/* Online dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "hsl(var(--success))",
                    boxShadow: "0 0 0 2px hsl(var(--sidebar-background))",
                  }}
                />
              </span>
              <div className="flex-1 min-w-0 leading-tight">
                <p
                  className="text-[13px] font-semibold truncate"
                  style={{ color: "hsl(0 0% 100%)" }}
                >
                  {displayName}
                </p>
                <p
                  className="text-[11px] truncate mt-0.5 capitalize"
                  style={{ color: "hsl(0 0% 100% / 0.4)" }}
                >
                  {roleLabel}
                </p>
              </div>
              {/* Logout button — expanded mode */}
              <button
                type="button"
                onClick={handleLogout}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                style={{ color: "hsl(0 0% 100% / 0.35)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(0 72% 50% / 0.15)";
                  (e.currentTarget as HTMLElement).style.color = "hsl(0 72% 60%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 100% / 0.35)";
                }}
              >
                <LogOut className="w-[15px] h-[15px]" />
              </button>
            </div>
          )}

          {/* Collapsed: avatar + logout stacked, centered */}
          {collapsed && (
            <div className="hidden md:flex flex-col items-center gap-1.5">
              <span
                className="relative flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(30 82% 55%))",
                  boxShadow: "0 0 0 1px hsl(22 72% 48% / 0.3)",
                }}
                aria-hidden="true"
                title={displayName}
              >
                {initials}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "hsl(var(--success))",
                    boxShadow: "0 0 0 2px hsl(var(--sidebar-background))",
                  }}
                />
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Déconnexion"
                aria-label="Déconnexion"
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                style={{ color: "hsl(0 0% 100% / 0.35)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(0 72% 50% / 0.15)";
                  (e.currentTarget as HTMLElement).style.color = "hsl(0 72% 60%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 100% / 0.35)";
                }}
              >
                <LogOut className="w-[15px] h-[15px]" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
