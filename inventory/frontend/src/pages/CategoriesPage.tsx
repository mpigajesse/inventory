import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/productService";
import type { Category } from "@/services/productService";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Validation schema ────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── Category form modal ──────────────────────────────────────────────────────

interface CategoryFormModalProps {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

function CategoryFormModal({ open, category, onClose, onSaved }: CategoryFormModalProps) {
  const isEdit = category !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
    },
  });

  // Reset form values whenever the modal opens or the target category changes
  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        description: category?.description ?? "",
      });
    }
  }, [open, category, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CategoryFormValues) => productService.createCategory(data),
    onSuccess: () => {
      toast.success("Catégorie créée avec succès");
      onSaved();
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Impossible de créer la catégorie.";
      toast.error("Erreur lors de la création", { description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CategoryFormValues) =>
      productService.updateCategory(category!.id, data),
    onSuccess: () => {
      toast.success("Catégorie mise à jour avec succès");
      onSaved();
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Impossible de modifier la catégorie.";
      toast.error("Erreur lors de la modification", { description: message });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: CategoryFormValues) {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              placeholder="Ex : Téléphones, Accessoires…"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              placeholder="Description optionnelle de la catégorie"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "form"; category: Category | null }
  | { type: "delete"; category: Category };

export default function CategoriesPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [search, setSearch] = useState("");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productService.getCategories(),
  });

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée");
      setModal({ type: "none" });
    },
    onError: () => {
      toast.error("Erreur lors de la suppression", {
        description: "Impossible de supprimer cette catégorie. Réessayez.",
      });
    },
  });

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = search.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : categories;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDelete() {
    if (modal.type !== "delete") return;
    deleteMutation.mutate(modal.category.id);
  }

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title="Catégories"
        subtitle="Gestion des catégories de produits"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* Header de page premium */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              Catégories
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? (
                <span className="opacity-60">Chargement…</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {categories.length}
                  </span>{" "}
                  catégorie{categories.length !== 1 ? "s" : ""} · organisez votre
                  catalogue
                </>
              )}
            </p>
          </div>
          {can('manage_products') && (
            <Button
              size="sm"
              className="shrink-0 rounded-lg shadow-sm shadow-primary/20 bg-gradient-to-br from-primary to-primary/85 hover:from-primary hover:to-primary text-primary-foreground"
              onClick={() => setModal({ type: "form", category: null })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          )}
        </div>

        {/* Toolbar — search seul */}
        <div className="bg-card border rounded-xl shadow-sm p-2.5 sm:p-3 mb-4">
          <SearchInput
            placeholder="Rechercher une catégorie…"
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Mobile cards — grid 2 cols — md:hidden */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          {isLoading && (
            <div className="col-span-2 flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-2 bg-card border rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <Tag className="w-8 h-8 opacity-40" />
              <p className="text-sm">Aucune catégorie trouvée.</p>
            </div>
          )}
          {!isLoading &&
            filtered.map((category) => (
              <div
                key={category.id}
                className="group relative bg-card border rounded-xl p-3 flex flex-col gap-2 hover:shadow-md hover:border-primary/30 transition-all"
              >
                {/* Header : icône + badge count */}
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 shrink-0">
                    <Tag className="w-5 h-5" />
                  </span>
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                    {category.product_count}
                  </span>
                </div>

                {/* Nom + description */}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{category.name}</p>
                  {category.description ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {category.description}
                    </p>
                  ) : (
                    <p className="text-[11px] italic opacity-50 mt-0.5">
                      Aucune description
                    </p>
                  )}
                </div>

                {/* Actions visibles */}
                {can('manage_products') && (
                  <div className="flex items-center gap-1 pt-1.5 border-t mt-auto">
                    <button
                      className="flex-1 p-1.5 rounded-md hover:bg-secondary transition-colors flex items-center justify-center gap-1 text-[11px] text-muted-foreground font-medium"
                      title="Modifier"
                      onClick={() => setModal({ type: "form", category })}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                      title="Supprimer"
                      onClick={() => setModal({ type: "delete", category })}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Desktop table — hidden md:block */}
        <div className="hidden md:block bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="bg-muted/60">
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th className="text-center w-32">Produits</th>
                  <th className="w-28 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="text-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                )}

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Tag className="w-8 h-8 opacity-40" />
                        <p className="text-sm">Aucune catégorie trouvée.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filtered.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 shrink-0">
                            <Tag className="w-4 h-4" />
                          </span>
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground text-sm">
                        {category.description || <span className="italic opacity-50">—</span>}
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          {category.product_count}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 pr-2">
                          {can('manage_products') && (
                            <button
                              className="p-2 rounded-md hover:bg-secondary transition-colors"
                              title="Modifier"
                              onClick={() => setModal({ type: "form", category })}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                          {can('manage_products') && (
                            <button
                              className="p-2 rounded-md hover:bg-destructive/10 transition-colors"
                              title="Supprimer"
                              onClick={() => setModal({ type: "delete", category })}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {!isLoading && categories.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {filtered.length} catégorie{filtered.length !== 1 ? "s" : ""}
            {search ? ` sur ${categories.length}` : ""}
          </p>
        )}
      </div>

      {/* ── Modal : Formulaire catégorie ──────────────────────────────────────── */}
      <CategoryFormModal
        open={modal.type === "form"}
        category={modal.type === "form" ? modal.category : null}
        onClose={() => setModal({ type: "none" })}
        onSaved={handleSaved}
      />

      {/* ── AlertDialog : Confirmer suppression ──────────────────────────────── */}
      <AlertDialog
        open={modal.type === "delete"}
        onOpenChange={(open) => { if (!open) setModal({ type: "none" }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer{" "}
              <strong>
                {modal.type === "delete" ? modal.category.name : ""}
              </strong>
              . Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
