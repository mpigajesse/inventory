import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
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
import { ArrowLeft, Package, Camera, X, Loader2, Image as ImageIcon, DollarSign, Barcode } from "lucide-react";
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

// ─── Section card wrapper ─────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
    >
      <h3 className="font-bold text-sm mb-5 flex items-center gap-2 text-foreground">
        <span style={{ color: 'hsl(22 72% 48%)' }}>{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

function Field({ label, required, error, hint, children, htmlFor }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Image upload zone ────────────────────────────────────────────────────────

interface ImageUploadZoneProps {
  previewUrl: string;
  isDragging: boolean;
  watchedName: string;
  watchedCategoryName: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClear: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
}

function ImageUploadZone({
  previewUrl,
  isDragging,
  watchedName,
  watchedCategoryName,
  fileInputRef,
  onClear,
  onDrop,
  onDragOver,
  onDragLeave,
}: ImageUploadZoneProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-200 cursor-pointer"
      style={{
        borderColor: isDragging ? 'hsl(22 72% 48%)' : 'hsl(var(--border))',
        background: isDragging ? 'hsl(22 72% 48% / 0.05)' : 'hsl(var(--muted) / 0.5)',
        minHeight: '200px',
      }}
      onClick={() => fileInputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      tabIndex={0}
      aria-label="Zone de dépôt d'image — cliquer ou glisser-déposer"
      onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
    >
      {previewUrl ? (
        <>
          <img
            src={previewUrl}
            alt="Aperçu du produit"
            className="w-full object-cover"
            style={{ maxHeight: '200px' }}
          />
          {/* Overlay on hover */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <div className="text-center">
              <Camera className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Changer l'image</p>
            </div>
          </div>
          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors"
            style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
            aria-label="Supprimer l'image"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          {/* Smart icon: product icon if name/category, otherwise upload icon */}
          {watchedName || watchedCategoryName ? (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                 style={{ background: 'hsl(22 72% 48% / 0.1)' }}>
              <ProductIcon
                name={watchedName}
                category={watchedCategoryName}
                size="lg"
              />
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'hsl(22 72% 48% / 0.1)' }}
            >
              <ImageIcon className="w-7 h-7" style={{ color: 'hsl(22 72% 48%)' }} />
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-foreground text-sm">
              {isDragging ? "Relâcher pour déposer" : "Glisser-déposer une image"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ou cliquer pour choisir · JPG, PNG, WebP max 5 Mo
            </p>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors pointer-events-none"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          >
            Parcourir les fichiers
          </span>
        </div>
      )}
    </div>
  );
}

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

  // ── Derive display values ──────────────────────────────────────────────────

  const watchedName = watch("name");
  const watchedCategoryId = watch("category");
  const watchedCategoryName =
    categories.find((c) => c.id === watchedCategoryId)?.name ?? "";

  const currentImageSrc = imagePreview || existingProduct?.image_url || "";

  const isLoading = isEdit && productLoading;

  const pageTitle = isEdit ? "Modifier le produit" : "Nouveau produit";
  const pageSubtitle = isEdit
    ? `Modification de ${existingProduct?.name ?? "produit"}`
    : "Ajouter un produit au catalogue";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title={pageTitle}
        subtitle={pageSubtitle}
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-5 rounded-full shrink-0"
                style={{ background: 'linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))' }}
              />
              <h1
                className="text-xl font-extrabold text-foreground"
                style={{ letterSpacing: '-0.025em' }}
              >
                {pageTitle}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground ml-3 mt-0.5">
              Remplissez les informations du produit
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* ── 2-column layout ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── Left column — form (2/3) ─────────────────────────────── */}
              <div className="lg:col-span-2 space-y-5">

                {/* Section: informations produit */}
                <SectionCard icon={<Package className="w-4 h-4" />} title="Informations produit">
                  <div className="space-y-5">
                    <Field label="Nom du produit" required htmlFor="name" error={errors.name?.message}>
                      <Input
                        id="name"
                        placeholder="Ex : Samsung Galaxy A54, Câble USB-C…"
                        className="h-11 rounded-lg focus-visible:ring-primary/50"
                        aria-invalid={errors.name ? "true" : undefined}
                        {...register("name")}
                      />
                    </Field>

                    <Field label="Catégorie" required error={errors.category?.message}>
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
                    </Field>

                    <Field
                      label="Code-barres"
                      htmlFor="barcode"
                      hint="Scannable avec un lecteur USB ou saisie manuelle."
                    >
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="barcode"
                          placeholder="Ex : 6001068002802"
                          className="h-11 rounded-lg focus-visible:ring-primary/50 font-mono pl-9"
                          {...register("barcode")}
                        />
                      </div>
                    </Field>

                    <Field label="Description" htmlFor="description">
                      <Textarea
                        id="description"
                        placeholder="Informations supplémentaires sur le produit..."
                        className="resize-none rounded-lg focus-visible:ring-primary/50 min-h-[80px]"
                        rows={3}
                        {...register("description")}
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* Section: tarification */}
                <SectionCard icon={<DollarSign className="w-4 h-4" />} title="Tarification">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field
                      label="Prix de vente (FCFA)"
                      required
                      htmlFor="selling_price"
                      error={errors.selling_price?.message}
                    >
                      <Input
                        id="selling_price"
                        type="number"
                        min={0}
                        placeholder="0"
                        className="h-11 rounded-lg focus-visible:ring-primary/50"
                        aria-invalid={errors.selling_price ? "true" : undefined}
                        {...register("selling_price", { valueAsNumber: true })}
                      />
                    </Field>

                    <Field
                      label="Prix d'achat (FCFA)"
                      required
                      htmlFor="purchase_price"
                      error={errors.purchase_price?.message}
                    >
                      <Input
                        id="purchase_price"
                        type="number"
                        min={0}
                        placeholder="0"
                        className="h-11 rounded-lg focus-visible:ring-primary/50"
                        aria-invalid={errors.purchase_price ? "true" : undefined}
                        {...register("purchase_price", { valueAsNumber: true })}
                      />
                    </Field>
                  </div>
                </SectionCard>
              </div>

              {/* ── Right column — image (1/3) ───────────────────────────── */}
              <div className="space-y-5">
                <div
                  className="rounded-2xl p-5"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                >
                  <h3 className="font-bold text-sm mb-5 text-foreground">Photo du produit</h3>

                  <ImageUploadZone
                    previewUrl={currentImageSrc}
                    isDragging={isDragOver}
                    watchedName={watchedName ?? ""}
                    watchedCategoryName={watchedCategoryName}
                    fileInputRef={fileInputRef}
                    onClear={clearImage}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  />

                  {currentImageSrc && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 text-xs font-medium w-full text-center transition-colors"
                      style={{ color: 'hsl(22 72% 48%)' }}
                    >
                      Changer l'image
                    </button>
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

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                style={{
                  background: isPending ? 'hsl(22 72% 48% / 0.6)' : 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 1.25rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 14px hsl(22 72% 48% / 0.3)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? "Enregistrer les modifications" : "Créer le produit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
