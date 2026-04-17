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
import { useRef, useState, useEffect } from "react";
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
  animStyle?: React.CSSProperties;
}

function SectionCard({ icon, title, children, animStyle }: SectionCardProps) {
  return (
    <div
      style={{
        borderRadius: '20px',
        padding: '20px',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        ...animStyle,
      }}
    >
      {/* Section header avec fond muted/60% et icône gradient cuivre */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          padding: '8px 12px',
          borderRadius: '12px',
          background: 'hsl(var(--muted) / 0.6)',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'white', display: 'flex' }}>{icon}</span>
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>
          {title}
        </h3>
      </div>
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
      {error && (
        <p
          className="text-xs text-destructive"
          style={{
            animation: 'fieldErrorIn 0.2s ease forwards',
          }}
        >
          {error}
        </p>
      )}
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
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `2px dashed ${isDragging ? 'hsl(22 72% 48% / 0.9)' : 'hsl(22 72% 48% / 0.3)'}`,
        background: isDragging ? 'hsl(22 72% 48% / 0.06)' : 'hsl(22 72% 48% / 0.02)',
        minHeight: '200px',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, background 0.2s ease',
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
            style={{
              maxHeight: '200px',
              animation: 'imageReveal 0.3s ease forwards',
            }}
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
          {/* Icône centrale — container rond 64×64, fond cuivre/10% */}
          {watchedName || watchedCategoryName ? (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'hsl(22 72% 48% / 0.1)',
              }}
            >
              <ProductIcon
                name={watchedName}
                category={watchedCategoryName}
                size="lg"
              />
            </div>
          ) : (
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'hsl(22 72% 48% / 0.1)',
              }}
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

  // ── Mount animation ────────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function sectionStagger(index: number): React.CSSProperties {
    return {
      opacity: isMounted ? 1 : 0,
      transform: isMounted ? 'translateY(0)' : 'translateY(10px)',
      transition: `opacity 0.3s ease ${index * 90}ms, transform 0.3s ease ${index * 90}ms`,
    };
  }

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
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{
              opacity: isMounted ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          >

            {/* ── 2-column layout ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── Left column — form (2/3) ─────────────────────────────── */}
              <div className="lg:col-span-2 space-y-5">

                {/* Section: informations produit */}
                <SectionCard icon={<Package className="w-4 h-4" />} title="Informations produit" animStyle={sectionStagger(0)}>
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
                        <Barcode
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: 'hsl(var(--muted-foreground))', transition: 'color 0.2s ease' }}
                          data-barcode-icon
                        />
                        <Input
                          id="barcode"
                          placeholder="Ex : 6001068002802"
                          className="h-11 rounded-lg focus-visible:ring-primary/50 font-mono pl-9"
                          onFocus={(e) => {
                            const icon = e.currentTarget.parentElement?.querySelector('[data-barcode-icon]') as HTMLElement | null;
                            if (icon) icon.style.color = 'hsl(22 72% 48%)';
                          }}
                          onBlur={(e) => {
                            const icon = e.currentTarget.parentElement?.querySelector('[data-barcode-icon]') as HTMLElement | null;
                            if (icon) icon.style.color = '';
                          }}
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

                {/* Section: tarification — prix côte à côte, vente mis en avant */}
                <SectionCard icon={<DollarSign className="w-4 h-4" />} title="Tarification" animStyle={sectionStagger(1)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Prix de vente — plus mis en avant avec bordure cuivre */}
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
                        className="h-11 focus-visible:ring-primary/50"
                        aria-invalid={errors.selling_price ? "true" : undefined}
                        style={{
                          borderRadius: '12px',
                          borderColor: errors.selling_price
                            ? undefined
                            : 'hsl(22 72% 48% / 0.4)',
                          boxShadow: '0 0 0 1px hsl(22 72% 48% / 0.15)',
                        }}
                        {...register("selling_price", { valueAsNumber: true })}
                      />
                    </Field>

                    {/* Prix d'achat — secondaire */}
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
                        className="h-11 focus-visible:ring-primary/50"
                        aria-invalid={errors.purchase_price ? "true" : undefined}
                        style={{ borderRadius: '12px' }}
                        {...register("purchase_price", { valueAsNumber: true })}
                      />
                    </Field>
                  </div>
                </SectionCard>
              </div>

              {/* ── Right column — image (1/3) ───────────────────────────── */}
              <div className="space-y-5">
                <div
                  style={{
                    borderRadius: '20px',
                    padding: '20px',
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    ...sectionStagger(2),
                  }}
                >
                  {/* Header cohérent avec SectionCard */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '20px',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: 'hsl(var(--muted) / 0.6)',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
                        flexShrink: 0,
                      }}
                    >
                      <ImageIcon className="w-4 h-4" style={{ color: 'white' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'hsl(var(--foreground))' }}>
                      Photo du produit
                    </h3>
                  </div>

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

              {/* Submit button — border-radius 14px, height 52px, shadow cuivre */}
              <button
                type="submit"
                disabled={isPending}
                style={{
                  background: isPending
                    ? 'hsl(22 72% 48% / 0.6)'
                    : 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  height: '52px',
                  paddingLeft: '1.5rem',
                  paddingRight: '1.5rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  boxShadow: isPending
                    ? 'none'
                    : '0 4px 16px hsl(22 72% 48% / 0.35), 0 1px 4px hsl(22 72% 48% / 0.2)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s',
                  opacity: isPending ? 0.7 : 1,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isPending) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 8px 24px hsl(22 72% 48% / 0.45), 0 2px 6px hsl(22 72% 48% / 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = isPending
                    ? 'none'
                    : '0 4px 16px hsl(22 72% 48% / 0.35), 0 1px 4px hsl(22 72% 48% / 0.2)';
                }}
                onMouseDown={(e) => {
                  if (!isPending) (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
                onMouseUp={(e) => {
                  if (!isPending) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
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
