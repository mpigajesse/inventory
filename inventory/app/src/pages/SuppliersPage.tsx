import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Phone, Mail, Package, Edit, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type SupplierStatus = "actif" | "inactif";

interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  products: string[];
  lastOrder: string;
  status: SupplierStatus;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    name: "Distribugo Gabon",
    contact: "Modeste Essono",
    phone: "+241 07 11 22 33",
    email: "modeste@distribugo.ga",
    products: ["Lait Nido 400g", "Sucre en poudre 1kg", "Farine 1kg"],
    lastOrder: "12/04/2026",
    status: "actif",
  },
  {
    id: 2,
    name: "Boissons & Co",
    contact: "Sylvie Mba",
    phone: "+241 06 44 55 66",
    email: "contact@boissonsco.ga",
    products: ["Coca-Cola 1.5L", "Eau Tangui 1.5L", "Jus de fruit 1L"],
    lastOrder: "10/04/2026",
    status: "actif",
  },
  {
    id: 3,
    name: "Hygiène Pro",
    contact: "Hervé Nkoghe",
    phone: "+241 07 77 88 99",
    email: "hygiene.pro@email.com",
    products: ["Savon Palmolive", "Détergent Omo 1kg", "Lessive 2kg"],
    lastOrder: "08/04/2026",
    status: "actif",
  },
  {
    id: 4,
    name: "Alimentation Centrale",
    contact: "Rose Ovono",
    phone: "+241 06 00 11 22",
    email: "",
    products: ["Riz Uncle Ben's 5kg", "Pâtes Panzani 500g", "Huile Dinor 1L"],
    lastOrder: "05/04/2026",
    status: "actif",
  },
  {
    id: 5,
    name: "Import Express",
    contact: "Franck Moussavou",
    phone: "+241 07 33 44 55",
    email: "franck@importexpress.ga",
    products: ["Biscuits Belvita"],
    lastOrder: "01/03/2026",
    status: "inactif",
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [search, setSearch] = useState("");

  // Only delete confirmation remains as a modal
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  function handleDelete() {
    if (!deletingSupplier) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplier.id));
    setDeletingSupplier(null);
  }

  return (
    <>
      <Topbar
        title="Fournisseurs"
        subtitle="Gestion des fournisseurs et des approvisionnements"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <SearchInput
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={setSearch}
          />
          <Button className="shrink-0 sm:ml-auto" onClick={() => navigate("/suppliers/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau fournisseur
          </Button>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <EmptyState
            message="Aucun fournisseur trouvé."
            icon={<Truck className="w-10 h-10" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-card rounded-lg border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {supplier.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.contact}</p>
                  </div>
                  <StatusBadge
                    label={supplier.status === "actif" ? "Actif" : "Inactif"}
                    variant={supplier.status === "actif" ? "success" : "default"}
                  />
                </div>

                {/* Contact info */}
                <div className="space-y-2 text-xs mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{supplier.phone}</span>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                </div>

                {/* Products */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span>{supplier.products.length} produit{supplier.products.length > 1 ? "s" : ""} fourni{supplier.products.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {supplier.products.slice(0, 3).map((product, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-secondary text-secondary-foreground"
                      >
                        {product}
                      </span>
                    ))}
                    {supplier.products.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-secondary text-muted-foreground">
                        +{supplier.products.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t mt-auto">
                  <div>
                    <p className="text-xs text-muted-foreground">Dernière commande</p>
                    <p className="text-sm font-medium">{supplier.lastOrder || "—"}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      title="Modifier"
                      onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                    >
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      title="Supprimer"
                      onClick={() => setDeletingSupplier(supplier)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AlertDialog : Supprimer fournisseur ── */}
      <AlertDialog
        open={!!deletingSupplier}
        onOpenChange={(open) => {
          if (!open) setDeletingSupplier(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer{" "}
              <strong>{deletingSupplier?.name}</strong>. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
