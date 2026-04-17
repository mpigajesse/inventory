import { useOutletContext, useNavigate, useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Truck, X, Loader2, Building2, Phone, Mail, MapPin, Tag, CalendarDays, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Validation schema ────────────────────────────────────────────────────────

const supplierSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  contact: z.string().min(2, "Le nom du contact est requis"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  email: z.string().email("Email invalide").or(z.literal("")),
  address: z.string().optional(),
  lastOrder: z.string().optional(),
  status: z.enum(["actif", "inactif"], { required_error: "Sélectionnez un statut" }),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

// ─── Mock data for edit pre-fill ──────────────────────────────────────────────

interface MockSupplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address?: string;
  products: string[];
  lastOrder: string;
  status: "actif" | "inactif";
}

const MOCK_SUPPLIERS: MockSupplier[] = [
  {
    id: 1,
    name: "Distribugo Gabon",
    contact: "Modeste Essono",
    phone: "+241 07 11 22 33",
    email: "modeste@distribugo.ga",
    address: "Zone Industrielle d'Oloumi, Libreville",
    products: ["Lait Nido 400g", "Sucre en poudre 1kg", "Farine 1kg"],
    lastOrder: "12/04/2026",
    status: "actif",
  },
  {
    id: 2,
    name: "Boissons & Co",
    contact: "Sylvie Mba",
    phone: "+241 06 44 55 66",
    email: "contact@boissonsco.ga",
    address: "Port-Gentil, BP 1234",
    products: ["Coca-Cola 1.5L", "Eau Tangui 1.5L", "Jus de fruit 1L"],
    lastOrder: "10/04/2026",
    status: "actif",
  },
  {
    id: 3,
    name: "Hygiène Pro",
    contact: "Hervé Nkoghe",
    phone: "+241 07 77 88 99",
    email: "hygiene.pro@email.com",
    address: "",
    products: ["Savon Palmolive", "Détergent Omo 1kg", "Lessive 2kg"],
    lastOrder: "08/04/2026",
    status: "actif",
  },
  {
    id: 4,
    name: "Alimentation Centrale",
    contact: "Rose Ovono",
    phone: "+241 06 00 11 22",
    email: "",
    address: "Libreville, Nzeng-Ayong",
    products: ["Riz Uncle Ben's 5kg", "Pâtes Panzani 500g", "Huile Dinor 1L"],
    lastOrder: "05/04/2026",
    status: "actif",
  },
  {
    id: 5,
    name: "Import Express",
    contact: "Franck Moussavou",
    phone: "+241 07 33 44 55",
    email: "franck@importexpress.ga",
    address: "",
    products: ["Biscuits Belvita"],
    lastOrder: "01/03/2026",
    status: "inactif",
  },
];

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  animationDelay?: number;
}

function SectionCard({ title, icon, children, animationDelay = 0 }: SectionCardProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 2px 8px hsl(22 30% 15% / 0.05)",
        animation: "slideInUp 0.35s ease forwards",
        animationDelay: `${animationDelay}ms`,
        opacity: 0,
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-5 pb-4"
           style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(22 72% 48% / 0.10)" }}
        >
          <span style={{ color: "hsl(22 72% 48%)" }}>{icon}</span>
        </div>
        <p
          className="text-xs font-bold uppercase tracking-[0.12em]"
          style={{ color: "hsl(22 72% 48%)" }}
        >
          {title}
        </p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

// ─── Tag input for products ───────────────────────────────────────────────────

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ value, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-background min-h-[48px] transition-shadow"
      style={{ border: "1.5px solid hsl(var(--border))" }}
      onFocus={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(22 72% 48%)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 0 0 3px hsl(22 72% 48% / 0.12)";
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }
      }}
    >
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: "hsl(22 72% 48% / 0.10)",
            color: "hsl(22 72% 48%)",
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="hover:text-destructive transition-colors ml-0.5"
            aria-label={`Supprimer ${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(inputValue)}
        placeholder={value.length === 0 ? "Saisir un produit puis Entrée..." : ""}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ─── Styled Input ─────────────────────────────────────────────────────────────

function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={[
        "h-11 rounded-xl bg-background",
        props.className ?? "",
      ].join(" ")}
      style={{
        border: "1.5px solid hsl(var(--border))",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        ...(props.style ?? {}),
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "hsl(22 72% 48%)";
        e.currentTarget.style.boxShadow = "0 0 0 3px hsl(22 72% 48% / 0.12)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "hsl(var(--border))";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierFormPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const isEdit = id !== undefined;
  const supplier = isEdit
    ? MOCK_SUPPLIERS.find((s) => s.id === Number(id)) ?? null
    : null;

  const [productTags, setProductTags] = useState<string[]>(
    supplier?.products ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contact: supplier.contact,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address ?? "",
          lastOrder: supplier.lastOrder,
          status: supplier.status,
        }
      : {
          name: "",
          contact: "",
          phone: "",
          email: "",
          address: "",
          lastOrder: "",
          status: "actif",
        },
  });

  function onSubmit(values: SupplierFormValues) {
    setIsSubmitting(true);
    setTimeout(() => {
      void values;
      void productTags;
      navigate("/suppliers");
    }, 600);
  }

  const pageTitle = isEdit ? "Modifier le fournisseur" : "Nouveau fournisseur";
  const pageSubtitle = isEdit
    ? `Modification de ${supplier?.name ?? "fournisseur inconnu"}`
    : "Ajouter un fournisseur";

  return (
    <>
      <Topbar
        title={pageTitle}
        subtitle={pageSubtitle}
        onMenuClick={onMenuClick}
      />
      <div
        className="page-container"
        style={{ animation: "fadeIn 0.3s ease forwards" }}
      >

        {/* ── Breadcrumb ────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Retour aux fournisseurs
          </Link>
        </div>

        {/* ── Page heading ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
              boxShadow: "0 4px 14px hsl(22 72% 48% / 0.3)",
            }}
          >
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div
                className="w-1 h-5 rounded-full"
                style={{
                  background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
                }}
              />
              <h1
                className="text-xl font-extrabold text-foreground"
                style={{ letterSpacing: "-0.02em" }}
              >
                {pageTitle}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground pl-3">
              {isEdit
                ? "Modifiez les informations du fournisseur ci-dessous."
                : "Renseignez les coordonnées et produits du nouveau fournisseur."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Colonne gauche : Informations entreprise ──────────── */}
            <SectionCard
              title="Informations entreprise"
              icon={<Building2 className="w-3.5 h-3.5" />}
              animationDelay={0}
            >
              <Field
                label="Nom du fournisseur"
                required
                error={errors.name?.message}
              >
                <StyledInput
                  id="name"
                  placeholder="Ex : Distribugo Gabon"
                  aria-invalid={errors.name ? "true" : undefined}
                  {...register("name")}
                />
              </Field>

              <Field
                label="Nom du contact"
                required
                error={errors.contact?.message}
              >
                <StyledInput
                  id="contact"
                  placeholder="Ex : Jean Mouloungui"
                  aria-invalid={errors.contact ? "true" : undefined}
                  {...register("contact")}
                />
              </Field>

              <Field
                label="Téléphone"
                required
                error={errors.phone?.message}
              >
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  />
                  <StyledInput
                    id="phone"
                    placeholder="+241 07 XX XX XX"
                    className="pl-9"
                    aria-invalid={errors.phone ? "true" : undefined}
                    {...register("phone")}
                  />
                </div>
              </Field>

              <Field
                label="Email"
                error={errors.email?.message}
              >
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  />
                  <StyledInput
                    id="email"
                    type="email"
                    placeholder="contact@fournisseur.ga"
                    className="pl-9"
                    aria-invalid={errors.email ? "true" : undefined}
                    {...register("email")}
                  />
                </div>
              </Field>

              <Field label="Adresse">
                <div className="relative">
                  <MapPin
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  />
                  <StyledInput
                    id="address"
                    placeholder="Ex : Zone Industrielle d'Oloumi, Libreville"
                    className="pl-9"
                    {...register("address")}
                  />
                </div>
              </Field>
            </SectionCard>

            {/* ── Colonne droite ────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Produits fournis */}
              <SectionCard
                title="Produits fournis"
                icon={<Tag className="w-3.5 h-3.5" />}
                animationDelay={90}
              >
                <Field label="Produits">
                  <TagInput value={productTags} onChange={setProductTags} />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Saisir le nom d'un produit puis appuyer sur{" "}
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted border border-border">
                      Entrée
                    </kbd>{" "}
                    ou virgule pour l'ajouter.
                  </p>
                </Field>
              </SectionCard>

              {/* Statut et commandes */}
              <SectionCard
                title="Statut et commandes"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                animationDelay={180}
              >
                <Field
                  label="Dernière commande"
                  error={errors.lastOrder?.message}
                >
                  <div className="relative">
                    <CalendarDays
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                    />
                    <StyledInput
                      id="lastOrder"
                      placeholder="JJ/MM/AAAA"
                      className="pl-9"
                      {...register("lastOrder")}
                    />
                  </div>
                </Field>

                <Field
                  label="Statut"
                  required
                  error={errors.status?.message}
                >
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger
                          className="w-full h-11 rounded-xl bg-background transition-shadow"
                          style={{
                            border: "1.5px solid hsl(var(--border))",
                          }}
                        >
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actif">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ background: "hsl(152 38% 38%)" }}
                              />
                              Actif
                            </span>
                          </SelectItem>
                          <SelectItem value="inactif">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full inline-block bg-muted-foreground/50" />
                              Inactif
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </SectionCard>
            </div>
          </div>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 justify-end pt-6 mt-6"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
          >
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl px-5 font-medium transition-colors hover:border-primary/30 hover:text-primary"
              onClick={() => navigate("/suppliers")}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl px-6 text-white font-semibold border-0 hover:brightness-105 hover:-translate-y-px"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                boxShadow: "0 4px 14px hsl(22 72% 48% / 0.30)",
                transition: "transform 0.15s ease, box-shadow 0.2s ease",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? "Enregistrer les modifications" : "Ajouter le fournisseur"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
