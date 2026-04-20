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
import { useState, useEffect } from "react";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Debounce : évite une requête API à chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", debouncedSearch],
    queryFn: () =>
      supplierService.getAll(debouncedSearch ? { search: debouncedSearch } : undefined),
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
      // Extraire le message Django depuis la réponse Axios
      let message = "Impossible d'archiver ce fournisseur. Réessayez.";
      if (
        error !== null &&
        typeof error === "object" &&
        "response" in error
      ) {
        const axiosError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
        message =
          axiosError.response?.data?.detail ??
          axiosError.response?.data?.message ??
          axiosError.message ??
          message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error("Erreur lors de l'archivage", { description: message });
    },
  });

  function handleDelete() {
    if (!deletingSupplier) return;
    deleteMutation.mutate(deletingSupplier.id);
  }

  function getInitials(name: string): string {
    if (!name || name.trim() === "") return "?";
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0] ?? "")
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {can("manage_suppliers") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportSuppliers(suppliers)}
                className="h-11 min-w-[44px] rounded-lg border-border hover:border-primary/30 hover:text-primary transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Exporter Excel</span>
              </Button>
            )}
            {can("manage_suppliers") && (
              <Button
                size="sm"
                className="h-11 min-w-[44px] text-white font-semibold transition-all hover:brightness-105 hover:-translate-y-px border-0"
                style={{
                  background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  boxShadow: "0 4px 16px hsl(22 72% 48% / 0.38), 0 1px 3px hsl(22 72% 48% / 0.2)",
                  borderRadius: "10px",
                }}
                onClick={() => navigate("/suppliers/new")}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau fournisseur</span>
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
          <div key={search} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "1.25rem" }}>
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
    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)";
    e.currentTarget.style.borderColor = "hsl(var(--border) / 0.6)";
  }

  return (
    <div
      className="group flex flex-col p-5"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.6)",
        borderRadius: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
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
            className="flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
              boxShadow: "0 2px 8px hsl(22 72% 48% / 0.25)",
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
          {/* Badge statut amélioré */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
            style={{
              borderRadius: "8px",
              background: isActive
                ? "hsl(152 38% 38% / 0.12)"
                : "hsl(220 14% 60% / 0.12)",
              color: isActive ? "hsl(152 38% 32%)" : "hsl(220 14% 46%)",
            }}
          >
            {isActive ? (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: "hsl(152 38% 38%)",
                  boxShadow: "0 0 0 0 hsl(152 38% 38% / 0.4)",
                  animation: "supplierPulse 2s ease-in-out infinite",
                }}
              />
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "hsl(220 14% 60%)" }}
              />
            )}
            {isActive ? "Actif" : "Inactif"}
          </span>
          {/* Actions : toujours visibles sur mobile, hover-only sur desktop */}
          {canManage && (
            <div className="flex items-center gap-0.5 ml-1 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
              <button
                className="p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                <Edit2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                className="p-2.5 rounded-lg hover:bg-destructive/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Archiver"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 text-destructive/70" />
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
        className="flex items-center justify-between gap-2 pt-3 min-w-0"
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
          supplier.balance > 0 ? (
            <span
              className="text-xs font-bold tabular-nums truncate max-w-[100px] xs:max-w-none"
              style={{
                fontFamily: "Fraunces, serif",
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              +{supplier.balance.toLocaleString("fr-FR")} FCFA
            </span>
          ) : (
            <span
              className="text-xs font-bold tabular-nums truncate max-w-[100px] xs:max-w-none"
              style={{
                fontFamily: "Fraunces, serif",
                color: "hsl(4 72% 52%)",
              }}
            >
              {supplier.balance.toLocaleString("fr-FR")} FCFA
            </span>
          )
        )}
      </div>
    </div>
  );
}
