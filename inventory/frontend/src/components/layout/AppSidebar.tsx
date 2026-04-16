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

const navItems: NavItem[] = [
  { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard },
  { label: "Notifications", path: "/notifications", icon: Bell, badge: 5 },
  { label: "Point de vente", path: "/pos", icon: ShoppingCart },
  { label: "Produits", path: "/products", icon: Package },
  { label: "Catégories", path: "/categories", icon: Tag },
  { label: "Codes-barres", path: "/barcodes", icon: QrCode },
  { label: "Stock", path: "/stock", icon: Warehouse },
  { label: "Factures", path: "/invoices", icon: FileText },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Fournisseurs", path: "/suppliers", icon: Truck },
  { label: "Utilisateurs", path: "/users", icon: UserCog },
  { label: "Rapports", path: "/reports", icon: BarChart3 },
  { label: "Paramètres", path: "/settings", icon: Settings },
  { label: "Administration", path: "/admin/overview", icon: ShieldCheck },
];

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
}

export function AppSidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNavClick = () => {
    onMobileOpenChange(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <>
      {/* Mobile overlay — dark backdrop when sidebar is open on mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-200",
          // Desktop: always visible, width depends on collapsed state
          "md:translate-x-0",
          collapsed ? "md:w-[60px]" : "md:w-[240px]",
          // Mobile: full-width sidebar, slides in/out
          "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ background: "hsl(var(--sidebar-bg))" }}
      >
        {/* Logo / Header */}
        <div
          className="flex items-center justify-between h-14 px-4 border-b"
          style={{ borderColor: "hsl(var(--sidebar-border))" }}
        >
          {/* Show label when not collapsed on desktop, always on mobile */}
          <span
            className={cn(
              "text-base font-semibold tracking-tight",
              collapsed && "md:hidden"
            )}
            style={{ color: "hsl(var(--sidebar-fg-active))" }}
          >
            INVENTORY
          </span>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors hidden md:flex"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button — min 44px touch target */}
          <button
            onClick={() => onMobileOpenChange(false)}
            className="p-2.5 rounded-md hover:bg-white/5 transition-colors md:hidden"
            aria-label="Fermer le menu"
            style={{ color: "hsl(var(--sidebar-fg))" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all",
                  collapsed && "md:justify-center md:px-0"
                )}
                style={{
                  color: isActive
                    ? "hsl(var(--sidebar-fg-active))"
                    : "hsl(var(--sidebar-fg))",
                  background: isActive ? "hsl(221 83% 53% / 0.12)" : "transparent",
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                    style={{ background: "hsl(var(--sidebar-accent))" }}
                  />
                )}

                {/* Icon with notification badge when collapsed */}
                <span className="relative shrink-0">
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.badge !== undefined && item.badge > 0 && collapsed && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-semibold">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>

                {/* Label + badge when expanded */}
                <span
                  className={cn(
                    "flex-1 flex items-center justify-between",
                    collapsed && "md:hidden"
                  )}
                >
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-semibold">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3">
          <button
            onClick={handleLogout}
            className={cn(
              "group flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium w-full transition-colors hover:bg-white/5",
              collapsed && "md:justify-center md:px-0"
            )}
            style={{ color: "hsl(var(--sidebar-fg))" }}
            title={collapsed ? "Déconnexion" : undefined}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
            <span className={cn(collapsed && "md:hidden")}>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
