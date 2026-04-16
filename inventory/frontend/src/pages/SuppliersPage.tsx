import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { supplierService } from "@/services/supplierService";
import type { Supplier } from "@/services/supplierService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierService.getAll(),
  });

  const suppliers = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeletingSupplier(null);
    },
  });

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? "").includes(search)
  );

  function handleDelete() {
    if (!deletingSupplier) return;
    deleteMutation.mutate(deletingSupplier.id);
  }

  // Initiales du nom fournisseur (2 lettres max)
  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Chargement des fournisseurs…
          </div>
        )}

        {/* Cards */}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            message="Aucun fournisseur trouvé."
            icon={<Truck className="w-10 h-10" />}
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-card rounded-lg border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {getInitials(supplier.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{supplier.name}</p>
                    {supplier.contact_name && (
                      <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2 text-xs mb-4">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                </div>

                {/* Orders count + location */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {supplier.orders_count ?? 0} commande
                      {(supplier.orders_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                    {(supplier.city || supplier.country) && (
                      <span className="ml-auto text-[11px]">
                        {[supplier.city, supplier.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end pt-4 border-t mt-auto">
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
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
