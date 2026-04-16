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

const pages = [
  { label: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard, shortcut: "D" },
  { label: "Point de vente", path: "/pos", icon: ShoppingCart, shortcut: "P" },
  { label: "Produits", path: "/products", icon: Package },
  { label: "Stock", path: "/stock", icon: Warehouse },
  { label: "Factures", path: "/invoices", icon: FileText },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Utilisateurs", path: "/users", icon: UserCog },
  { label: "Rapports", path: "/reports", icon: BarChart3 },
  { label: "Paramètres", path: "/settings", icon: Settings },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Mon profil", path: "/profile", icon: User },
  { label: "Codes-barres", path: "/barcodes", icon: QrCode },
  { label: "Fournisseurs", path: "/suppliers", icon: Truck },
];

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

  // Keep Escape handled by the dialog itself (built-in cmdk/radix behaviour)
  // Register Ctrl+K globally — lifted to AppLayout but also handled here as fallback
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
      <CommandInput placeholder="Rechercher une page..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              value={page.label}
              onSelect={() => handleSelect(page.path)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <page.icon className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span>{page.label}</span>
              {page.shortcut && (
                <CommandShortcut>⌘{page.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
