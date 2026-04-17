import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Bell,
  User,
  QrCode,
  Truck,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

// ─── Page registry ─────────────────────────────────────────────────────────────

type PageEntry = {
  label: string;
  path: string;
  icon: React.ElementType;
  shortcut?: string;
  group: "principal" | "gestion" | "compte";
};

const pages: PageEntry[] = [
  { label: "Tableau de bord", path: "/dashboard",     icon: LayoutDashboard, shortcut: "D", group: "principal" },
  { label: "Point de vente",  path: "/pos",            icon: ShoppingCart,    shortcut: "P", group: "principal" },
  { label: "Produits",        path: "/products",       icon: Package,                        group: "gestion"   },
  { label: "Stock",           path: "/stock",          icon: Warehouse,                      group: "gestion"   },
  { label: "Factures",        path: "/invoices",       icon: FileText,                       group: "gestion"   },
  { label: "Clients",         path: "/clients",        icon: Users,                          group: "gestion"   },
  { label: "Fournisseurs",    path: "/suppliers",      icon: Truck,                          group: "gestion"   },
  { label: "Codes-barres",    path: "/barcodes",       icon: QrCode,                         group: "gestion"   },
  { label: "Utilisateurs",    path: "/users",          icon: UserCog,                        group: "gestion"   },
  { label: "Rapports",        path: "/reports",        icon: BarChart3,                      group: "gestion"   },
  { label: "Paramètres",      path: "/settings",       icon: Settings,                       group: "compte"    },
  { label: "Notifications",   path: "/notifications",  icon: Bell,                           group: "compte"    },
  { label: "Mon profil",      path: "/profile",        icon: User,                           group: "compte"    },
];

const GROUP_LABELS: Record<PageEntry["group"], string> = {
  principal: "Principal",
  gestion:   "Gestion",
  compte:    "Compte & paramètres",
};

const groups = (["principal", "gestion", "compte"] as PageEntry["group"][]).map((key) => ({
  key,
  label: GROUP_LABELS[key],
  items: pages.filter((p) => p.group === key),
}));

// ─── Component ─────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  // Ctrl/Cmd+K toggle — also registered in AppLayout; this is a fallback
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Custom search row with prominent icon */}
      <div className="flex items-center gap-2.5 px-4 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <CommandInput
          placeholder="Rechercher une page, une action..."
          className="border-0 shadow-none focus:ring-0 px-0 h-12 bg-transparent text-sm placeholder:text-muted-foreground"
        />
      </div>

      <CommandList className="max-h-[400px]">
        <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
          Aucun résultat trouvé.
        </CommandEmpty>

        {groups.map(({ key, label, items }) => (
          <CommandGroup key={key} heading={label}>
            {items.map((page) => (
              <CommandItem
                key={page.path}
                value={page.label}
                onSelect={() => handleSelect(page.path)}
                className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5 rounded-md
                           aria-selected:bg-primary/15 aria-selected:text-primary"
              >
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <page.icon className="w-3.5 h-3.5 text-muted-foreground aria-selected:text-primary" />
                </div>
                <span className="flex-1 text-sm">{page.label}</span>
                {page.shortcut && (
                  <CommandShortcut className="text-xs text-muted-foreground/70">
                    ⌘{page.shortcut}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      <div className="px-4 py-2 border-t border-border flex items-center gap-3">
        <span className="text-xs text-muted-foreground/60">
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] font-mono mr-1">↑↓</kbd>
          naviguer
        </span>
        <span className="text-xs text-muted-foreground/60">
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] font-mono mr-1">↵</kbd>
          ouvrir
        </span>
        <span className="text-xs text-muted-foreground/60 ml-auto">
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] font-mono mr-1">Esc</kbd>
          fermer
        </span>
      </div>
    </CommandDialog>
  );
}
