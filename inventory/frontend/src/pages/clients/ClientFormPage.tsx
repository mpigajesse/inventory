import { useOutletContext, useNavigate, useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, UserPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Validation schema ────────────────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  email: z.string().email("Email invalide").or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

// ─── Mock data for edit pre-fill ──────────────────────────────────────────────

interface MockClient {
  id: number;
  name: string;
  phone: string;
  email: string;
  address?: string;
  notes: string;
}

const MOCK_CLIENTS: MockClient[] = [
  { id: 1, name: "Jean Mouloungui", phone: "+241 07 12 34 56", email: "jean@email.com", address: "Libreville, Quartier Louis", notes: "" },
  { id: 2, name: "Marie Obiang", phone: "+241 06 78 90 12", email: "", address: "", notes: "Cliente régulière" },
  { id: 3, name: "Paul Ndong", phone: "+241 07 45 67 89", email: "paul.n@email.com", address: "Libreville, Owendo", notes: "" },
  { id: 4, name: "Sophie Mintsa", phone: "+241 06 23 45 67", email: "", address: "", notes: "" },
  { id: 5, name: "André Nzé", phone: "+241 07 89 01 23", email: "andre.nze@email.com", address: "Libreville, Batterie IV", notes: "Gros client" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientFormPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const isEdit = id !== undefined;
  const client = isEdit
    ? MOCK_CLIENTS.find((c) => c.id === Number(id)) ?? null
    : null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          phone: client.phone,
          email: client.email,
          address: client.address ?? "",
          notes: client.notes,
        }
      : {
          name: "",
          phone: "",
          email: "",
          address: "",
          notes: "",
        },
  });

  function onSubmit(values: ClientFormValues) {
    setIsSubmitting(true);
    // In V1 (mock data), simulate async save then navigate
    setTimeout(() => {
      if (isEdit) {
        toast.success("Client modifié", {
          description: `${values.name} a été mis à jour avec succès.`,
        });
      } else {
        toast.success("Client enregistré", {
          description: `${values.name} a été ajouté avec succès.`,
        });
      }
      navigate("/clients");
    }, 600);
  }

  const pageTitle = isEdit ? "Modifier le client" : "Nouveau client";
  const pageSubtitle = isEdit
    ? `Modification de ${client?.name ?? "client inconnu"}`
    : "Ajouter un client à la base";

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
            to="/clients"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux clients
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {pageTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? "Modifiez les informations du client ci-dessous."
                : "Renseignez les coordonnées du nouveau client."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Colonne gauche : Informations personnelles ─────────────── */}
            <div className="bg-card rounded-xl border p-6">

              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                Informations personnelles
              </p>

              {/* Nom */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="name" className="text-sm font-medium mb-1.5">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex : Jean Mouloungui"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.name ? "true" : undefined}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
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
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  aria-invalid={errors.email ? "true" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* ── Colonne droite : Coordonnées + Notes ──────────────────── */}
            <div className="bg-card rounded-xl border p-6">

              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                Coordonnées et notes
              </p>

              {/* Adresse */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="address" className="text-sm font-medium mb-1.5">
                  Adresse
                </Label>
                <Input
                  id="address"
                  placeholder="Ex : Libreville, Quartier Louis"
                  className="h-11 rounded-lg focus-visible:ring-primary/50"
                  {...register("address")}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5 mt-6">
                <Label htmlFor="notes" className="text-sm font-medium mb-1.5">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Informations complémentaires sur le client..."
                  className="resize-none rounded-lg focus-visible:ring-primary/50 min-h-[120px]"
                  rows={5}
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 justify-end pt-6 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg"
              onClick={() => navigate("/clients")}
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
              {isEdit ? "Enregistrer les modifications" : "Créer le client"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
