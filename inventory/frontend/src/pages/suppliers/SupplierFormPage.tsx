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
import { ArrowLeft, Save, Truck, X, Loader2 } from "lucide-react";
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
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background min-h-[44px] focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-0 transition-shadow">
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="hover:text-destructive transition-colors"
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
    // In V1 (mock data), simulate async save then navigate
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
      <div className="page-container animate-slide-in">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/suppliers"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux fournisseurs
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
            <Truck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? "Modifiez les informations du fournisseur ci-dessous."
                : "Renseignez les coordonnées et produits du nouveau fournisseur."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Colonne gauche : Informations entreprise ───────────────── */}
            <div className="bg-card rounded-xl border p-6">

              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                Informations entreprise
              </p>

              {/* Nom entreprise */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="name" className="text-sm font-medium mb-1.5">
                  Nom du fournisseur <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex : Distribugo Gabon"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.name ? "true" : undefined}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="contact" className="text-sm font-medium mb-1.5">
                  Nom du contact <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact"
                  placeholder="Ex : Jean Mouloungui"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.contact ? "true" : undefined}
                  {...register("contact")}
                />
                {errors.contact && (
                  <p className="text-xs text-destructive">{errors.contact.message}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="phone" className="text-sm font-medium mb-1.5">
                  Téléphone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+241 07 XX XX XX"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.phone ? "true" : undefined}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="email" className="text-sm font-medium mb-1.5">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@fournisseur.ga"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.email ? "true" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Adresse */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="address" className="text-sm font-medium mb-1.5">
                  Adresse
                </Label>
                <Input
                  id="address"
                  placeholder="Ex : Zone Industrielle d'Oloumi, Libreville"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  {...register("address")}
                />
              </div>
            </div>

            {/* ── Colonne droite : Produits + Commande + Statut ─────────── */}
            <div className="space-y-6">

              {/* Produits fournis */}
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Produits fournis
                </p>

                <div className="space-y-1.5 mt-6">
                  <Label className="text-sm font-medium mb-1.5">Produits</Label>
                  <TagInput value={productTags} onChange={setProductTags} />
                  <p className="text-xs text-muted-foreground">
                    Saisir le nom d'un produit puis appuyer sur Entrée ou virgule pour l'ajouter.
                  </p>
                </div>
              </div>

              {/* Commande + Statut */}
              <div className="bg-card rounded-xl border p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Statut et commandes
                </p>

                {/* Dernière commande */}
                <div className="space-y-1.5 mt-6">
                  <Label htmlFor="lastOrder" className="text-sm font-medium mb-1.5">
                    Dernière commande
                  </Label>
                  <Input
                    id="lastOrder"
                    placeholder="JJ/MM/AAAA"
                    className="h-11 rounded-lg focus-visible:ring-primary/50"
                    {...register("lastOrder")}
                  />
                  {errors.lastOrder && (
                    <p className="text-xs text-destructive">{errors.lastOrder.message}</p>
                  )}
                </div>

                {/* Statut */}
                <div className="space-y-1.5 mt-6">
                  <Label className="text-sm font-medium mb-1.5">
                    Statut <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full h-11 rounded-lg focus:ring-primary/50">
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="inactif">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-xs text-destructive">{errors.status.message}</p>
                  )}
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
              onClick={() => navigate("/suppliers")}
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
              {isEdit ? "Enregistrer les modifications" : "Ajouter le fournisseur"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
