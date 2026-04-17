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
import { Plus, Loader2, Tag, Edit2, Trash2 } from "lucide-react";
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

// ─── Color palette for category cards ────────────────────────────────────────

const CARD_COLORS = [
  { bg: 'hsl(22 72% 48%)', light: 'hsl(22 72% 48% / 0.1)', border: 'hsl(22 72% 48% / 0.2)' },
  { bg: 'hsl(152 38% 38%)', light: 'hsl(152 38% 38% / 0.1)', border: 'hsl(152 38% 38% / 0.2)' },
  { bg: 'hsl(210 70% 52%)', light: 'hsl(210 70% 52% / 0.1)', border: 'hsl(210 70% 52% / 0.2)' },
  { bg: 'hsl(280 60% 52%)', light: 'hsl(280 60% 52% / 0.1)', border: 'hsl(280 60% 52% / 0.2)' },
  { bg: 'hsl(340 65% 48%)', light: 'hsl(340 65% 48% / 0.1)', border: 'hsl(340 65% 48% / 0.2)' },
  { bg: 'hsl(45 80% 45%)', light: 'hsl(45 80% 45% / 0.1)', border: 'hsl(45 80% 45% / 0.2)' },
];

// ─── Category card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category;
  colorIndex: number;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryCard({ category, colorIndex, canManage, onEdit, onDelete }: CategoryCardProps) {
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative rounded-2xl p-5 transition-all duration-200"
      style={{
        background: 'hsl(var(--card))',
        border: `1px solid ${hovered ? color.bg.replace(')', ' / 0.3)') : 'hsl(var(--border))'}`,
        boxShadow: hovered
          ? '0 10px 28px hsl(22 30% 15% / 0.1)'
          : '0 2px 8px hsl(22 30% 15% / 0.06)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icône catégorie */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: color.light, border: `1px solid ${color.border}` }}
      >
        <Tag className="w-6 h-6" style={{ color: color.bg }} />
      </div>

      <h3 className="font-bold text-foreground mb-1 truncate pr-14">{category.name}</h3>

      {category.description ? (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{category.description}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic mb-2">Aucune description</p>
      )}

      <p className="text-sm font-medium" style={{ color: color.bg }}>
        {category.product_count ?? 0} produit{(category.product_count ?? 0) !== 1 ? 's' : ''}
      </p>

      {/* Actions hover */}
      {canManage && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-muted"
            title="Modifier"
            onClick={onEdit}
          >
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-destructive/10"
            title="Supprimer"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── New category card ────────────────────────────────────────────────────────

interface NewCategoryCardProps {
  onClick: () => void;
}

function NewCategoryCard({ onClick }: NewCategoryCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 border-2 border-dashed"
      style={{
        borderColor: hovered ? 'hsl(22 72% 48% / 0.5)' : 'hsl(22 72% 48% / 0.3)',
        background: hovered ? 'hsl(22 72% 48% / 0.06)' : 'hsl(22 72% 48% / 0.02)',
        minHeight: '140px',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'hsl(22 72% 48% / 0.1)' }}
      >
        <Plus className="w-5 h-5" style={{ color: 'hsl(22 72% 48%)' }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'hsl(22 72% 48%)' }}>
        Nouvelle catégorie
      </p>
    </div>
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
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error("Erreur lors de la suppression", {
        description: detail ?? "Impossible de supprimer cette catégorie. Réessayez.",
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

  const totalProducts = categories.reduce(
    (sum, c) => sum + (c.product_count ?? 0),
    0
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDelete() {
    if (modal.type !== "delete") return;
    deleteMutation.mutate(modal.category.id);
  }

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  function openCreateModal() {
    setModal({ type: "form", category: null });
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

        {/* ── Page header premium ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full shrink-0"
                style={{ background: 'linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))' }}
              />
              <h1
                className="text-2xl font-extrabold text-foreground"
                style={{ letterSpacing: '-0.025em' }}
              >
                Catégories
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-3">
              {isLoading ? (
                <span className="opacity-60">Chargement…</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">{categories.length}</span> catégorie{categories.length !== 1 ? 's' : ''}{' '}
                  · <span className="font-medium text-foreground">{totalProducts}</span> produit{totalProducts !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>

          {can('manage_products') && (
            <Button
              size="sm"
              className="shrink-0 rounded-lg shadow-sm shadow-primary/20 bg-gradient-to-br from-primary to-primary/85 hover:from-primary hover:to-primary text-primary-foreground"
              onClick={openCreateModal}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          )}
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="bg-card border rounded-xl shadow-sm p-2.5 sm:p-3 mb-6">
          <SearchInput
            placeholder="Rechercher une catégorie…"
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!isLoading && filtered.length === 0 && !search && (
          <div
            className="rounded-2xl p-12 flex flex-col items-center gap-4 text-center"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', opacity: 0, animation: 'fadeIn 0.4s ease forwards' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'hsl(22 72% 48% / 0.1)' }}
            >
              <Tag className="w-8 h-8" style={{ color: 'hsl(22 72% 48%)' }} />
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">Aucune catégorie</p>
              <p className="text-sm text-muted-foreground">Commencez par créer votre première catégorie.</p>
            </div>
            {can('manage_products') && (
              <Button size="sm" onClick={openCreateModal}
                className="rounded-lg bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-sm shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />
                Créer une catégorie
              </Button>
            )}
          </div>
        )}

        {!isLoading && filtered.length === 0 && search && (
          <div className="rounded-2xl p-10 flex flex-col items-center gap-2 text-muted-foreground"
               style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', opacity: 0, animation: 'fadeIn 0.4s ease forwards' }}>
            <Tag className="w-8 h-8 opacity-40" />
            <p className="text-sm">Aucune catégorie correspond à « {search} ».</p>
          </div>
        )}

        {/* ── Category grid ─────────────────────────────────────────────────── */}
        {!isLoading && filtered.length > 0 && (
          <div key={search} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((category, idx) => (
              <div
                key={category.id}
                style={{
                  opacity: 0,
                  animation: 'slideInUp 0.35s ease forwards',
                  animationDelay: `${idx * 65}ms`,
                }}
              >
                <CategoryCard
                  category={category}
                  colorIndex={idx}
                  canManage={can('manage_products')}
                  onEdit={() => setModal({ type: "form", category })}
                  onDelete={() => setModal({ type: "delete", category })}
                />
              </div>
            ))}

            {/* Add new category card — only shown when not searching */}
            {!search && can('manage_products') && (
              <div
                style={{
                  opacity: 0,
                  animation: 'slideInUp 0.35s ease forwards',
                  animationDelay: `${filtered.length * 65}ms`,
                }}
              >
                <NewCategoryCard onClick={openCreateModal} />
              </div>
            )}
          </div>
        )}

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        {!isLoading && categories.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            {filtered.length} catégorie{filtered.length !== 1 ? 's' : ''}
            {search ? ` sur ${categories.length}` : ''}
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
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Vous êtes sur le point de supprimer{" "}
                  <strong>
                    {modal.type === "delete" ? modal.category.name : ""}
                  </strong>
                  . Cette action est irréversible.
                </p>
                <p className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                  Attention : si cette catégorie contient des produits, la suppression sera refusée.
                </p>
              </div>
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
