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
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const UNREAD_COUNT = 5;

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

/**
 * Build breadcrumb segments from a pathname.
 * Unrecognised path parts are capitalised as a graceful fallback.
 */
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

/**
 * Generate two-letter initials from a full display name.
 */
function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  notificationCount?: number;
}

export function Topbar({
  title,
  subtitle,
  onMenuClick,
  onSearchClick,
  notificationCount,
}: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const profilePath =
    currentUser?.role === "vendeur" ? "/vendeur/profile" : "/profile";
  const settingsPath =
    currentUser?.role === "vendeur" ? "/vendeur/settings" : "/settings";
  const segments = buildBreadcrumbs(location.pathname);
  const displayedCount = notificationCount ?? UNREAD_COUNT;
  const showBreadcrumbs = segments.length > 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

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

          {/* Notifications */}
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative flex items-center justify-center w-11 h-11 rounded-md hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            aria-label={`Notifications (${displayedCount} non lues)`}
          >
            <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
            {displayedCount > 0 && (
              <span
                className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold tabular-nums flex items-center justify-center"
                style={{
                  background: "hsl(var(--destructive))",
                  color: "hsl(var(--destructive-foreground))",
                  boxShadow: "0 0 0 2px hsl(var(--topbar-bg))",
                }}
              >
                {displayedCount > 99 ? "99+" : displayedCount}
              </span>
            )}
          </button>

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
