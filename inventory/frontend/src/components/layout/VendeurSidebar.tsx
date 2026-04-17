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
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Vendor-facing navigation — deliberately short (5 items) and split into
 * an operational group (POS, invoices, clients) and a personal group
 * (profile, settings). Matches the bottom-nav max-5 rule from Material.
 */
const navGroups: NavGroup[] = [
  {
    id: "operations",
    label: "Caisse",
    items: [
      { label: "Point de vente", path: "/vendeur/pos", icon: ShoppingCart },
      { label: "Factures", path: "/invoices", icon: FileText },
      { label: "Clients", path: "/clients", icon: Users },
    ],
  },
  {
    id: "personal",
    label: "Mon compte",
    items: [
      { label: "Mon profil", path: "/vendeur/profile", icon: UserCircle },
      { label: "Paramètres", path: "/vendeur/settings", icon: Settings },
    ],
  },
];

interface VendeurSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (value: boolean) => void;
  vendeurName?: string;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "V";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  const { currentUser, logout } = useAuth();

  const handleNavClick = (): void => {
    onMobileOpenChange(false);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate("/auth/login");
  };

  const displayName = currentUser?.name ?? vendeurName;
  const initials = getInitials(displayName);

  // Flattened nav items for the mobile bottom-nav (≤ 5 items per MD guideline)
  const mobileBottomItems = navGroups.flatMap((g) => g.items).slice(0, 5);

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
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-[width,transform] duration-200 ease-out",
          "md:translate-x-0",
          collapsed ? "md:w-[60px]" : "md:w-[240px]",
          "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          background: "hsl(var(--sidebar-bg))",
          boxShadow: "inset -1px 0 0 hsl(var(--sidebar-border))",
        }}
        aria-label="Navigation vendeur"
      >
        {/* ── Brand ──────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between h-16 px-3 border-b shrink-0"
          style={{ borderColor: "hsl(var(--sidebar-border))" }}
        >
          <Link
            to="/vendeur/pos"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-2.5 min-w-0 rounded-md transition-opacity hover:opacity-90",
              collapsed && "md:justify-center"
            )}
            aria-label="INVENTORY — Retour à la caisse"
          >
            <span
              className="relative flex items-center justify-center w-9 h-9 shrink-0 rounded-[10px]"
              style={{
                background: "var(--gradient-primary)",
                boxShadow:
                  "0 2px 6px -1px hsl(var(--primary) / 0.45), inset 0 1px 0 hsl(0 0% 100% / 0.18)",
              }}
            >
              <Package
                className="w-[18px] h-[18px] text-white"
                strokeWidth={2.25}
              />
              <span
                className="absolute top-1 right-1 w-1 h-1 rounded-full"
                style={{ background: "hsl(0 0% 100% / 0.65)" }}
                aria-hidden="true"
              />
            </span>

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
                Caisse vendeur
              </span>
            </span>
          </Link>

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

        {/* ── Nav ────────────────────────────────────────────────── */}
        <nav
          className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden"
          aria-label="Menu vendeur"
        >
          {navGroups.map((group, groupIdx) => (
            <div key={group.id} className={cn(groupIdx > 0 && "mt-3")}>
              <p
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.18em] px-3 mt-2 mb-1",
                  collapsed && "md:hidden"
                )}
                style={{ color: "hsl(var(--sidebar-fg) / 0.4)" }}
              >
                {group.label}
              </p>

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
                          paddingLeft: collapsed
                            ? undefined
                            : isActive
                              ? "10px"
                              : "12px",
                        }}
                      >
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
                        </span>

                        <span
                          className={cn(
                            "flex-1 truncate",
                            collapsed && "md:hidden"
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Footer ─────────────────────────────────────────────── */}
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
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{
                  background: "hsl(var(--success))",
                  boxShadow: "0 0 0 2px hsl(var(--sidebar-bg))",
                }}
              />
            </span>

            <div
              className={cn(
                "flex-1 min-w-0 leading-tight",
                collapsed && "md:hidden"
              )}
            >
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
                Vendeur
              </p>
            </div>

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

      {/* ── Mobile bottom nav ──────────────────────────────────────────
          Persistent bottom nav for vendors — they live in the POS and
          need one-tap access to their core surfaces at all times on
          mobile. Hidden when the drawer is open to avoid conflict. */}
      {!mobileOpen && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-20 md:hidden"
          aria-label="Navigation principale mobile"
          style={{
            background: "hsl(var(--sidebar-bg))",
            borderTop: "1px solid hsl(var(--sidebar-border))",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            boxShadow: "0 -4px 12px hsl(0 0% 0% / 0.15)",
          }}
        >
          <ul className="flex items-stretch justify-around h-16">
            {mobileBottomItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
              return (
                <li key={item.path} className="flex-1">
                  <Link
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 h-full w-full min-h-[44px]",
                      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/20"
                    )}
                    style={{
                      color: isActive
                        ? "hsl(var(--sidebar-accent))"
                        : "hsl(var(--sidebar-fg) / 0.8)",
                    }}
                  >
                    <item.icon
                      className="w-5 h-5"
                      strokeWidth={isActive ? 2.4 : 2}
                    />
                    <span
                      className="text-[10px] font-semibold tracking-tight"
                      style={{
                        color: isActive
                          ? "hsl(var(--sidebar-fg-active))"
                          : undefined,
                      }}
                    >
                      {item.label.split(" ")[0]}
                    </span>
                    {isActive && (
                      <span
                        className="absolute top-0 w-8 h-[2px] rounded-b-full"
                        style={{ background: "hsl(var(--sidebar-accent))" }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
