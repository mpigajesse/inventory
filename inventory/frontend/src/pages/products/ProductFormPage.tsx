import { useOutletContext, useNavigate, useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { ArrowLeft, Save, Package, Camera, X, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/productService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Validation schema ────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  selling_price: z
    .number({ invalid_type_error: "Le prix doit être un nombre" })
    .min(0, "Le prix ne peut pas être négatif"),
  purchase_price: z
    .number({ invalid_type_error: "Le prix d'achat doit être un nombre" })
    .min(0, "Le prix ne peut pas être négatif"),
  category: z
    .number({ invalid_type_error: "La catégorie est requise" })
    .int()
    .positive("La catégorie est requise"),
  barcode: z.string().optional(),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const isEdit = id !== undefined;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch categories ───────────────────────────────────────────────────────

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productService.getCategories(),
  });

  // ── Fetch existing product in edit mode ────────────────────────────────────

  const { data: existingProduct, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productService.getById(Number(id)),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    values: existingProduct
      ? {
          name: existingProduct.name,
          selling_price: existingProduct.selling_price,
          purchase_price: existingProduct.purchase_price,
          category: existingProduct.category,
          barcode: existingProduct.barcode ?? "",
          description: existingProduct.description ?? "",
        }
      : undefined,
    defaultValues: {
      name: "",
      selling_price: 0,
      purchase_price: 0,
      barcode: "",
      description: "",
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: FormData) => productService.create(data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit enregistré", {
        description: `${product.name} a été ajouté au catalogue.`,
      });
      navigate("/products");
    },
    onError: () => {
      toast.error("Erreur lors de la création", {
        description: "Impossible de créer le produit. Vérifiez les informations.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => productService.update(Number(id), data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      toast.success("Produit modifié", {
        description: `${product.name} a été mis à jour avec succès.`,
      });
      navigate("/products");
    },
    onError: () => {
      toast.error("Erreur lors de la modification", {
        description: "Impossible de modifier le produit. Vérifiez les informations.",
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Image helpers ──────────────────────────────────────────────────────────

  function readImageFile(file: File) {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setImagePreview(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readImageFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) readImageFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function onSubmit(values: ProductFormValues) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("selling_price", String(values.selling_price));
    formData.append("purchase_price", String(values.purchase_price));
    formData.append("category", String(values.category));
    if (values.barcode) formData.append("barcode", values.barcode);
    if (values.description) formData.append("description", values.description);
    if (imageFile) formData.append("image", imageFile);

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  }

  // ── Derive image preview source ────────────────────────────────────────────

  const watchedName = watch("name");
  const watchedCategoryId = watch("category");
  const watchedCategoryName =
    categories.find((c) => c.id === watchedCategoryId)?.name ?? "";

  const currentImageSrc = imagePreview || existingProduct?.image_url || "";
  const hasImagePreview = currentImageSrc.length > 0;

  const isLoading = isEdit && productLoading;

  const pageTitle = isEdit ? "Modifier le produit" : "Nouveau produit";
  const pageSubtitle = isEdit
    ? `Modification de ${existingProduct?.name ?? "produit"}`
    : "Ajouter un produit au catalogue";

  return (
    <>
      <Topbar
        title={pageTitle}
        subtitle={pageSubtitle}
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux produits
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? "Modifiez les informations du produit ci-dessous."
                : "Renseignez les informations du nouveau produit."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Colonne gauche : Informations de base ─────────────────── */}
              <div className="bg-card rounded-xl border p-6">

                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Informations de base
                </p>

                {/* Nom */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="name" className="text-sm font-medium mb-1.5">
                    Nom du produit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex : Lait Nido 400g"
                    className="h-11 rounded-lg focus-visible:ring-primary/50"
                    aria-invalid={errors.name ? "true" : undefined}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                {/* Catégorie */}
                <div className="space-y-1.5 mt-6">
                  <Label className="text-sm font-medium mb-1.5">
                    Catégorie <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value ? String(field.value) : ""}
                        disabled={categoriesLoading}
                      >
                        <SelectTrigger className="w-full h-11 rounded-lg focus:ring-primary/50">
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category.message}</p>
                  )}
                </div>

                {/* Prix de vente */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="selling_price" className="text-sm font-medium mb-1.5">
                    Prix de vente (FCFA) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="selling_price"
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-11 rounded-lg focus-visible:ring-primary/50"
                    aria-invalid={errors.selling_price ? "true" : undefined}
                    {...register("selling_price", { valueAsNumber: true })}
                  />
                  {errors.selling_price && (
                    <p className="text-xs text-destructive">{errors.selling_price.message}</p>
                  )}
                </div>

                {/* Prix d'achat */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="purchase_price" className="text-sm font-medium mb-1.5">
                    Prix d'achat (FCFA) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-11 rounded-lg focus-visible:ring-primary/50"
                    aria-invalid={errors.purchase_price ? "true" : undefined}
                    {...register("purchase_price", { valueAsNumber: true })}
                  />
                  {errors.purchase_price && (
                    <p className="text-xs text-destructive">{errors.purchase_price.message}</p>
                  )}
                </div>

                {/* Code-barres */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="barcode" className="text-sm font-medium mb-1.5">
                    Code-barres
                  </Label>
                  <Input
                    id="barcode"
                    placeholder="Ex : 6001068002802"
                    className="h-11 rounded-lg focus-visible:ring-primary/50 font-mono"
                    {...register("barcode")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Scannable avec un lecteur USB ou saisie manuelle.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="description" className="text-sm font-medium mb-1.5">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Informations supplémentaires sur le produit..."
                    className="resize-none rounded-lg focus-visible:ring-primary/50 min-h-[88px]"
                    rows={3}
                    {...register("description")}
                  />
                </div>
              </div>

              {/* ── Colonne droite : Image ─────────────────────────────────── */}
              <div className="space-y-6">
                <div className="bg-card rounded-xl border p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                    Image du produit
                  </p>

                  <div className="mt-6">
                    {hasImagePreview ? (
                      /* Preview state */
                      <div className="relative rounded-xl overflow-hidden border border-border bg-muted/40">
                        <img
                          src={currentImageSrc}
                          alt="Aperçu du produit"
                          className="w-full h-48 object-contain p-4"
                        />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-background/80 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors backdrop-blur-sm"
                          aria-label="Supprimer l'image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="px-4 pb-3 pt-1 border-t border-border bg-muted/20">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Changer l'image
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty drop zone */
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Zone de dépôt d'image — cliquer ou glisser-déposer"
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={[
                          "flex flex-col items-center justify-center gap-3 w-full h-48 rounded-xl cursor-pointer",
                          "border-2 border-dashed transition-colors",
                          isDragOver
                            ? "border-primary/60 bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-primary/[0.03]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-muted shrink-0">
                          {watchedName || watchedCategoryName ? (
                            <ProductIcon
                              name={watchedName ?? ""}
                              category={watchedCategoryName}
                              size="lg"
                            />
                          ) : (
                            <Camera className="w-7 h-7 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-center px-4">
                          <p className="text-sm font-medium text-foreground">
                            {isDragOver ? "Relâcher pour déposer" : "Cliquer ou glisser une image"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            JPG, PNG, WebP — max 2 Mo recommandé
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-hidden="true"
                      tabIndex={-1}
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 justify-end pt-6 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg"
                onClick={() => navigate("/products")}
                disabled={isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-lg bg-gradient-primary shadow-md shadow-primary/20 border-0 hover:-translate-y-px transition-transform"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEdit ? "Enregistrer les modifications" : "Ajouter le produit"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
