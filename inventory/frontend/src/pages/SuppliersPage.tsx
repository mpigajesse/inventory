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
import {
  Plus,
  Phone,
  Mail,
  Package,
  Edit2,
  Trash2,
  Truck,
  MapPin,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { exportSuppliers } from "@/lib/exportSuppliers";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supplierService } from "@/services/supplierService";
import type { Supplier } from "@/services/supplierService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () =>
      supplierService.getAll(search ? { search } : undefined),
  });

  const suppliers = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess: () => {
      toast.success("Fournisseur archivé", {
        description: `${deletingSupplier?.name ?? "Le fournisseur"} a été archivé avec succès.`,
      });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeletingSupplier(null);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Impossible d'archiver ce fournisseur. Réessayez.";
      toast.error("Erreur lors de l'archivage", { description: message });
    },
  });

  function handleDelete() {
    if (!deletingSupplier) return;
    deleteMutation.mutate(deletingSupplier.id);
  }

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

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full shrink-0"
                style={{
                  background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
                }}
              />
              <h1
                className="text-2xl font-extrabold"
                style={{ letterSpacing: "-0.025em" }}
              >
                Fournisseurs
              </h1>
              <span
                className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-bold"
                style={{
                  background: "hsl(22 72% 48% / 0.12)",
                  color: "hsl(22 72% 48%)",
                }}
              >
                {suppliers.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground pl-3">
              Gestion des approvisionnements
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {can("manage_suppliers") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportSuppliers(suppliers)}
                className="h-9 rounded-lg border-border hover:border-primary/30 hover:text-primary transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>
            )}
            {can("manage_suppliers") && (
              <Button
                size="sm"
                className="h-9 rounded-lg text-white font-semibold shadow-md transition-all hover:brightness-105 hover:-translate-y-px border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  boxShadow: "0 4px 14px hsl(22 72% 48% / 0.3)",
                }}
                onClick={() => navigate("/suppliers/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau fournisseur
              </Button>
            )}
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <SearchInput
            placeholder="Rechercher par nom, contact ou téléphone..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des fournisseurs…
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!isLoading && suppliers.length === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease forwards" }}>
            <EmptyState
              message="Aucun fournisseur trouvé."
              icon={<Truck className="w-10 h-10" />}
            />
          </div>
        )}

        {/* ── Supplier Cards ──────────────────────────────────────────── */}
        {!isLoading && suppliers.length > 0 && (
          <div key={search} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier, index) => {
              const ordersCount = supplier.orders_count ?? 0;
              const isActive = ordersCount > 0;
              const locationLabel = [supplier.city, supplier.country]
                .filter(Boolean)
                .join(", ");

              return (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  ordersCount={ordersCount}
                  isActive={isActive}
                  locationLabel={locationLabel}
                  initials={getInitials(supplier.name)}
                  canManage={can("manage_suppliers")}
                  onEdit={() => navigate(`/suppliers/${supplier.id}/edit`)}
                  onDelete={() => setDeletingSupplier(supplier)}
                  animationDelay={index * 65}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── AlertDialog : Archiver fournisseur ──────────────────────────── */}
      <AlertDialog
        open={!!deletingSupplier}
        onOpenChange={(open) => {
          if (!open) setDeletingSupplier(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingSupplier?.name}</strong> sera archivé et n'apparaîtra plus dans
              les listes.{" "}
              <span className="block mt-1 text-muted-foreground">
                Le fournisseur sera archivé (soft delete) — ses données et historique de
                commandes sont conservés.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archivage…
                </>
              ) : (
                "Archiver"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Supplier Card ────────────────────────────────────────────────────────────

interface SupplierCardProps {
  supplier: Supplier;
  ordersCount: number;
  isActive: boolean;
  locationLabel: string;
  initials: string;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  animationDelay?: number;
}

function SupplierCard({
  supplier,
  ordersCount,
  isActive,
  locationLabel,
  initials,
  canManage,
  onEdit,
  onDelete,
  animationDelay = 0,
}: SupplierCardProps) {
  function handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = "translateY(-3px)";
    e.currentTarget.style.boxShadow = "0 10px 28px hsl(22 30% 15% / 0.10)";
    e.currentTarget.style.borderColor = "hsl(22 72% 48% / 0.30)";
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 2px 8px hsl(22 30% 15% / 0.06)";
    e.currentTarget.style.borderColor = "hsl(var(--border))";
  }

  return (
    <div
      className="group flex flex-col rounded-2xl p-5"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
        animation: "slideInUp 0.35s ease forwards",
        animationDelay: `${animationDelay}ms`,
        opacity: 0,
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── Card header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar initiales */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate leading-snug">{supplier.name}</p>
            {supplier.contact_name && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {supplier.contact_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Badge statut */}
          <StatusBadge
            label={isActive ? "Actif" : "Inactif"}
            variant={isActive ? "success" : "default"}
          />
          {/* Actions (visibles au hover si gestionnaire) */}
          {canManage && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-1">
              <button
                className="p-1.5 rounded-lg transition-colors"
                style={{}}
                title="Modifier"
                onClick={onEdit}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "hsl(22 72% 48% / 0.10)";
                  (e.currentTarget as HTMLButtonElement).style.color = "hsl(22 72% 48%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "";
                  (e.currentTarget as HTMLButtonElement).style.color = "";
                }}
              >
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                title="Archiver"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Contact info ────────────────────────────────────────────── */}
      <div className="space-y-2 mb-4 flex-1">
        {supplier.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono tabular-nums">{supplier.phone}</span>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {locationLabel && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </div>
        )}
      </div>

      {/* ── Card footer ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.6)" }}
      >
        <div className="flex items-center gap-1.5">
          <Package
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: "hsl(22 72% 48%)" }}
          />
          <span className="text-xs text-muted-foreground">
            <span
              className="font-bold tabular-nums"
              style={{
                fontFamily: "Fraunces, serif",
                color: "hsl(22 72% 48%)",
                transition: "color 0.3s ease",
              }}
            >
              {ordersCount}
            </span>{" "}
            commande{ordersCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Balance si disponible */}
        {supplier.balance !== undefined && supplier.balance !== 0 && (
          <span
            className="text-xs font-bold tabular-nums"
            style={{
              fontFamily: "Fraunces, serif",
              color:
                supplier.balance > 0
                  ? "hsl(152 38% 38%)"
                  : "hsl(4 72% 52%)",
              transition: "color 0.3s ease",
            }}
          >
            {supplier.balance > 0 ? "+" : ""}
            {supplier.balance.toLocaleString("fr-FR")} FCFA
          </span>
        )}
      </div>
    </div>
  );
}
