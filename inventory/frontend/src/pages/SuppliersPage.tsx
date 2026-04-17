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
import { Plus, Phone, Mail, Package, Edit, Trash2, Truck, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

        {/* ── Premium Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/15">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Fournisseurs</h1>
                <span className="inline-flex items-center h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold">
                  {suppliers.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestion des approvisionnements
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="shrink-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm hover:shadow-md hover:brightness-105 transition-all"
            onClick={() => navigate("/suppliers/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau fournisseur
          </Button>
        </div>

        {/* ── Search bar ─────────────────────────────────────────── */}
        <div className="mb-5">
          <SearchInput
            placeholder="Rechercher par nom, contact ou téléphone..."
            value={search}
            onChange={setSearch}
          />
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
            {filtered.map((supplier) => {
              const ordersCount = supplier.orders_count ?? 0;
              const isActive = ordersCount > 0;
              const locationLabel = [supplier.city, supplier.country].filter(Boolean).join(", ");

              return (
                <div
                  key={supplier.id}
                  className="group bg-card rounded-xl border p-5 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-200 flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all"
                      style={{
                        background: "hsl(var(--primary) / 0.12)",
                        color: "hsl(var(--primary))",
                      }}
                    >
                      {getInitials(supplier.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{supplier.name}</p>
                      {supplier.contact_name && (
                        <p className="text-[11px] text-muted-foreground truncate">{supplier.contact_name}</p>
                      )}
                    </div>
                    <StatusBadge
                      label={isActive ? "Actif" : "Inactif"}
                      variant={isActive ? "success" : "default"}
                    />
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 text-xs mb-4">
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono tabular-nums">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {locationLabel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{locationLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer : stats + actions */}
                  <div className="flex items-end justify-between pt-4 border-t mt-auto gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Commandes
                      </p>
                      <p className="flex items-center gap-1.5 mt-0.5">
                        <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-mono font-bold text-primary text-sm tabular-nums">
                          {ordersCount}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Modifier"
                        onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                      >
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        title="Supprimer"
                        onClick={() => setDeletingSupplier(supplier)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
