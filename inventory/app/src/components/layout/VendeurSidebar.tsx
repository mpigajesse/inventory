import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Settings,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Point de vente", path: "/vendeur/pos", icon: ShoppingCart },
  { label: "Factures", path: "/invoices", icon: FileText },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Mon profil", path: "/vendeur/profile", icon: UserCircle },
  { label: "Paramètres", path: "/vendeur/settings", icon: Settings },
];

interface VendeurSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
  vendeurName?: string;
}

export function VendeurSidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  vendeurName = "Marie Vendeur",
}: VendeurSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const handleNavClick = () => {
    onMobileOpenChange(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate("/auth/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => onMobileOpenChange(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-200",
          "md:translate-x-0",
          collapsed ? "md:w-[60px]" : "md:w-[240px]",
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

          {/* Mobile close button */}
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
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                    style={{ background: "hsl(var(--sidebar-accent))" }}
                  />
                )}

                <span className="relative shrink-0">
                  <item.icon className="w-[18px] h-[18px]" />
                </span>

                <span
                  className={cn(
                    "flex-1 flex items-center justify-between",
                    collapsed && "md:hidden"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: user info + logout */}
        <div className="px-2 pb-3 border-t pt-3" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          {/* User info */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 mb-1 rounded-md",
              collapsed && "md:justify-center md:px-0"
            )}
          >
            <div
              className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-[11px] font-bold"
              style={{ color: "hsl(var(--sidebar-fg-active))" }}
            >
              {vendeurName.charAt(0).toUpperCase()}
            </div>
            <div className={cn("flex-1 min-w-0", collapsed && "md:hidden")}>
              <p
                className="text-[12px] font-semibold truncate leading-tight"
                style={{ color: "hsl(var(--sidebar-fg-active))" }}
              >
                {vendeurName}
              </p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-primary/20 text-primary mt-0.5">
                Vendeur
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium w-full transition-colors hover:bg-white/5",
              collapsed && "md:justify-center md:px-0"
            )}
            style={{ color: "hsl(var(--sidebar-fg))" }}
            title={collapsed ? "Déconnexion" : undefined}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className={cn(collapsed && "md:hidden")}>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
