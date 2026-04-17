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
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Alimentaire" | "Boissons" | "Hygiène" | "Entretien" | "Autre";

// ─── Validation schema ────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  price: z
    .number({ invalid_type_error: "Le prix doit être un nombre" })
    .min(0, "Le prix ne peut pas être négatif"),
  stock: z
    .number({ invalid_type_error: "La quantité doit être un nombre" })
    .int("La quantité doit être un entier")
    .min(0, "La quantité ne peut pas être négative"),
  category: z.enum(["Alimentaire", "Boissons", "Hygiène", "Entretien", "Autre"], {
    required_error: "La catégorie est requise",
  }),
  barcode: z.string().optional(),
  alertThreshold: z
    .number({ invalid_type_error: "Le seuil doit être un nombre" })
    .int("Le seuil doit être un entier")
    .min(0, "Le seuil ne peut pas être négatif")
    .optional(),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Mock data for edit pre-fill ──────────────────────────────────────────────

interface MockProduct {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  alertThreshold: number;
  category: Category;
  image?: string;
  notes?: string;
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: 1, name: "Lait Nido 400g", barcode: "6001068002802", price: 3500, stock: 3, alertThreshold: 5, category: "Alimentaire" },
  { id: 2, name: "Huile Dinor 1L", barcode: "6001068002819", price: 2500, stock: 5, alertThreshold: 5, category: "Alimentaire" },
  { id: 3, name: "Riz Uncle Ben's 5kg", barcode: "6001068002826", price: 8000, stock: 2, alertThreshold: 5, category: "Alimentaire" },
  { id: 4, name: "Coca-Cola 1.5L", barcode: "5449000000996", price: 1200, stock: 45, alertThreshold: 10, category: "Boissons" },
  { id: 5, name: "Savon Palmolive", barcode: "8714789763378", price: 800, stock: 4, alertThreshold: 5, category: "Hygiène" },
  { id: 6, name: "Pâtes Panzani 500g", barcode: "3038350012005", price: 1500, stock: 22, alertThreshold: 8, category: "Alimentaire" },
  { id: 7, name: "Sucre en poudre 1kg", barcode: "3256220010015", price: 1000, stock: 30, alertThreshold: 10, category: "Alimentaire" },
  { id: 8, name: "Eau Tangui 1.5L", barcode: "6291041500213", price: 500, stock: 60, alertThreshold: 15, category: "Boissons" },
  { id: 9, name: "Biscuits Belvita", barcode: "7622300689421", price: 1800, stock: 15, alertThreshold: 5, category: "Alimentaire" },
  { id: 10, name: "Détergent Omo 1kg", barcode: "8717163711040", price: 3200, stock: 8, alertThreshold: 5, category: "Entretien" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const isEdit = id !== undefined;
  const product = isEdit
    ? MOCK_PRODUCTS.find((p) => p.id === Number(id)) ?? null
    : null;

  const [imagePreview, setImagePreview] = useState<string>(product?.image ?? "");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          price: product.price,
          stock: product.stock,
          alertThreshold: product.alertThreshold,
          category: product.category,
          barcode: product.barcode,
          notes: product.notes ?? "",
        }
      : {
          name: "",
          price: 0,
          stock: 0,
          alertThreshold: 5,
          barcode: "",
          notes: "",
        },
  });

  const watchedName = watch("name");
  const watchedCategory = watch("category");

  function readImageFile(file: File) {
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
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(values: ProductFormValues) {
    setIsSubmitting(true);
    // In V1 (mock data), simulate async save then navigate
    setTimeout(() => {
      void imagePreview;
      if (isEdit) {
        toast.success("Produit modifié", {
          description: `${values.name} a été mis à jour avec succès.`,
        });
      } else {
        toast.success("Produit enregistré", {
          description: `${values.name} a été ajouté au catalogue.`,
        });
      }
      navigate("/products");
    }, 600);
  }

  const pageTitle = isEdit ? "Modifier le produit" : "Nouveau produit";
  const pageSubtitle = isEdit
    ? `Modification de ${product?.name ?? "produit inconnu"}`
    : "Ajouter un produit au catalogue";

  const hasImagePreview = imagePreview.startsWith("data:");

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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full h-11 rounded-lg focus:ring-primary/50">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alimentaire">Alimentaire</SelectItem>
                        <SelectItem value="Boissons">Boissons</SelectItem>
                        <SelectItem value="Hygiène">Hygiène</SelectItem>
                        <SelectItem value="Entretien">Entretien</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-xs text-destructive">{errors.category.message}</p>
                )}
              </div>

              {/* Prix */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="price" className="text-sm font-medium mb-1.5">
                  Prix de vente (FCFA) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  placeholder="0"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.price ? "true" : undefined}
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price.message}</p>
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

              {/* Notes */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="notes" className="text-sm font-medium mb-1.5">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Informations supplémentaires sur le produit..."
                  className="resize-none rounded-lg focus-visible:ring-primary/50 min-h-[88px]"
                  rows={3}
                  {...register("notes")}
                />
              </div>
            </div>

            {/* ── Colonne droite : Inventaire + Image ───────────────────── */}
            <div className="space-y-6">

              {/* Inventaire */}
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Inventaire
                </p>

                {/* Stock */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="stock" className="text-sm font-medium mb-1.5">
                    Quantité en stock <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    placeholder="0"
                    className="h-11 rounded-lg focus-visible:ring-primary/50"
                    aria-invalid={errors.stock ? "true" : undefined}
                    {...register("stock", { valueAsNumber: true })}
                  />
                  {errors.stock && (
                    <p className="text-xs text-destructive">{errors.stock.message}</p>
                  )}
                </div>

                {/* Seuil d'alerte */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="alertThreshold" className="text-sm font-medium mb-1.5">
                    Seuil d'alerte stock bas
                  </Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min={0}
                    placeholder="5"
                    className="h-11 rounded-lg focus-visible:ring-primary/50"
                    aria-invalid={errors.alertThreshold ? "true" : undefined}
                    {...register("alertThreshold", { valueAsNumber: true })}
                  />
                  {errors.alertThreshold && (
                    <p className="text-xs text-destructive">{errors.alertThreshold.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Une alerte sera déclenchée quand le stock passe sous ce seuil.
                  </p>
                </div>
              </div>

              {/* Image */}
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Image du produit
                </p>

                {/* Drop zone */}
                <div className="mt-6">
                  {hasImagePreview ? (
                    /* Preview state */
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/40">
                      <img
                        src={imagePreview}
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
                      {/* Icon with product preview fallback */}
                      <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-muted shrink-0">
                        {watchedName || watchedCategory ? (
                          <ProductIcon
                            name={watchedName ?? ""}
                            category={watchedCategory ?? "Autre"}
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
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-lg bg-gradient-primary shadow-md shadow-primary/20 border-0 hover:-translate-y-px transition-transform"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? "Enregistrer les modifications" : "Ajouter le produit"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
