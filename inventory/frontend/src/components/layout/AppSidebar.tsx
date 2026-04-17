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
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Bell,
  Truck,
  QrCode,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Navigation organised as meaningful groups — each group has a semantic label
 * that appears as a small, uppercase, tracked-out heading in the expanded
 * sidebar. The groups follow the user's mental model: first the daily
 * operational surfaces (POS, dashboard), then catalogue, then people, then
 * administration. This hierarchy reduces scan time compared to a flat list.
 */
const navGroups: NavGroup[] = [
  {
    id: "operations",
    label: "Opérations",
    items: [
      { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
      { label: "Point de vente", path: "/pos", icon: ShoppingCart },
      { label: "Notifications", path: "/notifications", icon: Bell, badge: 5 },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue & stock",
    items: [
      { label: "Produits", path: "/products", icon: Package },
      { label: "Catégories", path: "/categories", icon: Tag },
      { label: "Codes-barres", path: "/barcodes", icon: QrCode },
      { label: "Stock", path: "/stock", icon: Warehouse },
    ],
  },
  {
    id: "relations",
    label: "Relations",
    items: [
      { label: "Factures", path: "/invoices", icon: FileText },
      { label: "Clients", path: "/clients", icon: Users },
      { label: "Fournisseurs", path: "/suppliers", icon: Truck },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { label: "Utilisateurs", path: "/users", icon: UserCog },
      { label: "Rapports", path: "/reports", icon: BarChart3 },
      { label: "Paramètres", path: "/settings", icon: Settings },
      { label: "Administration", path: "/admin/overview", icon: ShieldCheck },
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

  const handleNavClick = (): void => {
    onMobileOpenChange(false);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate("/auth/login");
  };

  const initials = getInitials(currentUser?.name);
  const displayName = currentUser?.name ?? "Utilisateur";
  const roleLabel = currentUser?.role === "admin" ? "Administrateur" : "Vendeur";

  return (
    <>
      {/* Mobile scrim — stronger than before so drawer feels modal */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => onMobileOpenChange(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-[width,transform] duration-200 ease-out",
          "md:translate-x-0",
          collapsed ? "md:w-[60px]" : "md:w-[240px]",
          "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          background: "hsl(var(--sidebar-bg))",
          // Subtle inner rail on the right edge — separates sidebar from content
          // without looking like a heavy border. Uses a copper-tinted highlight.
          boxShadow: "inset -1px 0 0 hsl(var(--sidebar-border))",
        }}
        aria-label="Navigation principale"
      >
        {/* ── Brand / Header ──────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between h-16 px-3 border-b shrink-0"
          style={{ borderColor: "hsl(var(--sidebar-border))" }}
        >
          <Link
            to="/dashboard"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-2.5 min-w-0 rounded-md transition-opacity hover:opacity-90",
              collapsed && "md:justify-center"
            )}
            aria-label="INVENTORY — Retour au tableau de bord"
          >
            {/* Logo mark — copper gradient square with Package icon */}
            <span
              className="relative flex items-center justify-center w-9 h-9 shrink-0 rounded-[10px] shadow-sm"
              style={{
                background: "var(--gradient-primary)",
                boxShadow:
                  "0 2px 6px -1px hsl(var(--primary) / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.18)",
              }}
            >
              <Package className="w-[18px] h-[18px] text-white" strokeWidth={2.25} />
              {/* Tiny highlight dot, gives the logo a physical feel */}
              <span
                className="absolute top-1 right-1 w-1 h-1 rounded-full"
                style={{ background: "hsl(0 0% 100% / 0.65)" }}
                aria-hidden="true"
              />
            </span>

            {/* Wordmark — hidden when collapsed on desktop */}
            <span
              className={cn(
                "flex flex-col min-w-0 leading-none",
                collapsed && "md:hidden"
              )}
            >
              <span
                className="text-[13px] font-bold tracking-[0.22em]"
                style={{ color: "hsl(var(--sidebar-fg-active))" }}
              >
                INVENTORY
              </span>
              <span
                className="text-[9px] font-medium tracking-[0.3em] mt-1 uppercase"
                style={{ color: "hsl(var(--sidebar-fg) / 0.55)" }}
              >
                Naoservices
              </span>
            </span>
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "hidden md:flex items-center justify-center w-8 h-8 rounded-md transition-colors",
              "hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              collapsed && "md:hidden"
            )}
            style={{ color: "hsl(var(--sidebar-fg))" }}
            aria-label="Réduire la barre latérale"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Mobile close — 44px tap target */}
          <button
            type="button"
            onClick={() => onMobileOpenChange(false)}
            className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-md hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="Fermer le menu"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collapsed-state expand button — floats below brand, only on desktop */}
        {collapsed && (
          <div className="hidden md:flex justify-center pt-2">
            <button
              type="button"
              onClick={() => onCollapsedChange(false)}
              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              style={{ color: "hsl(var(--sidebar-fg))" }}
              aria-label="Développer la barre latérale"
              title="Développer"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Nav ────────────────────────────────────────────────────── */}
        <nav
          className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden"
          aria-label="Menu"
        >
          {navGroups.map((group, groupIdx) => (
            <div key={group.id} className={cn(groupIdx > 0 && "mt-3")}>
              {/* Group label — only visible when expanded */}
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.18em] px-3 mt-2 mb-1",
                  collapsed && "md:hidden"
                )}
                style={{ color: "hsl(var(--sidebar-fg) / 0.4)" }}
              >
                {group.label}
              </p>

              {/* Collapsed divider instead of label */}
              {collapsed && groupIdx > 0 && (
                <div
                  className="hidden md:block h-px mx-3 my-2"
                  style={{ background: "hsl(var(--sidebar-border))" }}
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
                          "group relative flex items-center gap-3 h-10 rounded-md text-[13px] font-medium",
                          "transition-colors duration-200 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                          collapsed ? "md:justify-center md:px-0 px-3" : "px-3",
                          isActive
                            ? "text-white"
                            : "hover:bg-[hsl(var(--sidebar-hover))]"
                        )}
                        style={{
                          color: isActive
                            ? "hsl(var(--sidebar-fg-active))"
                            : "hsl(var(--sidebar-fg))",
                          background: isActive
                            ? "hsl(var(--primary) / 0.12)"
                            : undefined,
                          borderLeft: isActive
                            ? "2px solid hsl(var(--sidebar-accent))"
                            : "2px solid transparent",
                          paddingLeft: collapsed ? undefined : isActive ? "10px" : "12px",
                        }}
                      >
                        {/* Icon — brighter copper tint when active */}
                        <span className="relative shrink-0 flex items-center justify-center">
                          <item.icon
                            className="w-[18px] h-[18px]"
                            strokeWidth={isActive ? 2.25 : 2}
                            style={{
                              color: isActive
                                ? "hsl(var(--sidebar-accent))"
                                : undefined,
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
                                  boxShadow:
                                    "0 0 0 2px hsl(var(--sidebar-bg))",
                                }}
                              >
                                {item.badge > 9 ? "9+" : item.badge}
                              </span>
                            )}
                        </span>

                        {/* Label + expanded badge */}
                        <span
                          className={cn(
                            "flex-1 flex items-center justify-between min-w-0",
                            collapsed && "md:hidden"
                          )}
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
          className="shrink-0 border-t p-2"
          style={{ borderColor: "hsl(var(--sidebar-border))" }}
        >
          <div
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-md",
              collapsed && "md:justify-center md:px-0"
            )}
          >
            {/* Avatar — copper-tinted glow ring when online */}
            <span
              className="relative shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-[12px] font-bold text-white"
              style={{
                background: "var(--gradient-primary)",
                boxShadow:
                  "0 0 0 1px hsl(var(--sidebar-border)), 0 1px 2px hsl(0 0% 0% / 0.4)",
              }}
              aria-hidden="true"
            >
              {initials}
              {/* Online dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{
                  background: "hsl(var(--success))",
                  boxShadow: "0 0 0 2px hsl(var(--sidebar-bg))",
                }}
              />
            </span>

            <div className={cn("flex-1 min-w-0 leading-tight", collapsed && "md:hidden")}>
              <p
                className="text-[13px] font-semibold truncate"
                style={{ color: "hsl(var(--sidebar-fg-active))" }}
              >
                {displayName}
              </p>
              <p
                className="text-[11px] truncate mt-0.5"
                style={{ color: "hsl(var(--sidebar-fg) / 0.7)" }}
              >
                {roleLabel}
              </p>
            </div>

            {/* Logout — icon-only button in expanded mode, tooltip on collapsed */}
            <button
              type="button"
              onClick={handleLogout}
              title="Déconnexion"
              aria-label="Déconnexion"
              className={cn(
                "shrink-0 flex items-center justify-center w-9 h-9 rounded-md transition-colors",
                "hover:bg-[hsl(var(--destructive)/0.15)] hover:text-[hsl(var(--destructive))]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                collapsed && "md:hidden"
              )}
              style={{ color: "hsl(var(--sidebar-fg))" }}
            >
              <LogOut className="w-[16px] h-[16px]" />
            </button>
          </div>

          {/* Logout visible row when collapsed (icon-only, centered) */}
          {collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              title="Déconnexion"
              aria-label="Déconnexion"
              className="hidden md:flex items-center justify-center w-full h-10 mt-1 rounded-md transition-colors hover:bg-[hsl(var(--destructive)/0.15)] hover:text-[hsl(var(--destructive))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              style={{ color: "hsl(var(--sidebar-fg))" }}
            >
              <LogOut className="w-[16px] h-[16px]" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
