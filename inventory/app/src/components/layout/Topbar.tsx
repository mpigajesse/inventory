import { Bell, Search, User, Menu, ChevronRight, Home } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
};

/** Build breadcrumb segments from a pathname */
function buildBreadcrumbs(pathname: string): { label: string; path: string }[] {
  // Split on "/" and accumulate segments, ignoring empty parts
  const parts = pathname.split("/").filter(Boolean);
  const segments: { label: string; path: string }[] = [];

  let cumPath = "";
  for (const part of parts) {
    cumPath += `/${part}`;
    const label = ROUTE_LABELS[cumPath];
    if (label) {
      segments.push({ label, path: cumPath });
    } else {
      // Capitalise the raw segment as fallback
      segments.push({
        label: part.charAt(0).toUpperCase() + part.slice(1),
        path: cumPath,
      });
    }
  }

  return segments;
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
  const { currentUser } = useAuth();
  const profilePath = currentUser?.role === 'vendeur' ? '/vendeur/profile' : '/profile';
  const segments = buildBreadcrumbs(location.pathname);
  const displayedCount = notificationCount ?? UNREAD_COUNT;
  // Show breadcrumbs only when there is more than one segment (deep page)
  const showBreadcrumbs = segments.length > 1;

  return (
    <header
      className="shrink-0 border-b"
      style={{
        background: "hsl(var(--topbar-bg))",
        borderColor: "hsl(var(--topbar-border))",
      }}
    >
      {/* Main topbar row */}
      <div className="h-14 flex items-center justify-between px-4 md:px-6 gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Hamburger — only visible on mobile */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2.5 rounded-md hover:bg-secondary transition-colors md:hidden shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search / quick-nav button — opens CommandPalette */}
          <button
            onClick={onSearchClick}
            className="p-2 rounded-md hover:bg-secondary transition-colors hidden sm:flex items-center gap-1.5 text-muted-foreground"
            aria-label="Recherche rapide (Ctrl+K)"
            title="Recherche rapide (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs hidden lg:inline">Ctrl K</span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="p-2 rounded-md hover:bg-secondary transition-colors relative"
            aria-label="Voir les notifications"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            {displayedCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
                {displayedCount > 99 ? "99+" : displayedCount}
              </span>
            ) : null}
          </button>

          {/* User avatar — navigates to profile */}
          <button
            onClick={() => navigate(profilePath)}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ml-1 hover:opacity-80 transition-opacity"
            title="Mon profil"
            aria-label="Mon profil"
          >
            <User className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Breadcrumb row — only shown on pages with depth > 1 */}
      {showBreadcrumbs && (
        <div className="flex items-center gap-1 px-4 md:px-6 pb-2 text-xs">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-3 h-3" />
            <span>Accueil</span>
          </Link>

          {segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1;
            return (
              <span key={seg.path} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
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
