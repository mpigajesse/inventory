import { useOutletContext, useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
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

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setImagePreview(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(values: ProductFormValues) {
    // In V1 (mock data), we just navigate back after simulating save
    console.log("Produit enregistré :", values, { image: imagePreview });
    navigate("/products");
  }

  const pageTitle = isEdit ? "Modifier le produit" : "Nouveau produit";
  const pageSubtitle = isEdit
    ? `Modification de ${product?.name ?? "produit inconnu"}`
    : "Ajouter un produit au catalogue";

  return (
    <>
      <Topbar
        title={pageTitle}
        subtitle={pageSubtitle}
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Colonne gauche : Informations de base ─────────────────── */}
            <div className="bg-card rounded-lg border p-6 space-y-5">
              <h2 className="text-sm font-semibold text-foreground border-b pb-3">
                Informations de base
              </h2>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nom du produit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex : Lait Nido 400g"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Catégorie */}
              <div className="space-y-1.5">
                <Label>
                  Catégorie <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full">
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
              <div className="space-y-1.5">
                <Label htmlFor="price">
                  Prix de vente (FCFA) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price.message}</p>
                )}
              </div>

              {/* Code-barres */}
              <div className="space-y-1.5">
                <Label htmlFor="barcode">Code-barres</Label>
                <Input
                  id="barcode"
                  placeholder="Ex : 6001068002802"
                  className="font-mono"
                  {...register("barcode")}
                />
                <p className="text-xs text-muted-foreground">
                  Scannable avec un lecteur USB ou saisie manuelle.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Informations supplémentaires sur le produit..."
                  className="resize-none"
                  rows={3}
                  {...register("notes")}
                />
              </div>
            </div>

            {/* ── Colonne droite : Inventaire + Image ───────────────────── */}
            <div className="space-y-6">

              {/* Inventaire */}
              <div className="bg-card rounded-lg border p-6 space-y-5">
                <h2 className="text-sm font-semibold text-foreground border-b pb-3">
                  Inventaire
                </h2>

                {/* Stock */}
                <div className="space-y-1.5">
                  <Label htmlFor="stock">
                    Quantité en stock <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    placeholder="0"
                    {...register("stock", { valueAsNumber: true })}
                  />
                  {errors.stock && (
                    <p className="text-xs text-destructive">{errors.stock.message}</p>
                  )}
                </div>

                {/* Seuil d'alerte */}
                <div className="space-y-1.5">
                  <Label htmlFor="alertThreshold">Seuil d'alerte stock bas</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min={0}
                    placeholder="5"
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
              <div className="bg-card rounded-lg border p-6 space-y-4">
                <h2 className="text-sm font-semibold text-foreground border-b pb-3">
                  Image du produit
                </h2>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {imagePreview.startsWith("data:") ? (
                      <img
                        src={imagePreview}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ProductIcon
                        name={watchedName ?? ""}
                        category={watchedCategory ?? "Autre"}
                        size="lg"
                      />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="imageFile">Choisir une image</Label>
                    <Input
                      id="imageFile"
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                      onChange={handleImageChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formats acceptés : JPG, PNG, WebP. Taille max recommandée : 2 Mo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/products")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? "Enregistrer les modifications" : "Ajouter le produit"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
