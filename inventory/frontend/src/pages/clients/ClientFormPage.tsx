import { useOutletContext, useNavigate, useParams } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
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
    // In V1 (mock data), we just navigate back after simulating save
    console.log("Client enregistré :", values);
    navigate("/clients");
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Colonne gauche : Informations personnelles ─────────────── */}
            <div className="bg-card rounded-lg border p-6 space-y-5">
              <h2 className="text-sm font-semibold text-foreground border-b pb-3">
                Informations personnelles
              </h2>

              {/* Nom */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex : Jean Mouloungui"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Téléphone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+241 07 XX XX XX"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* ── Colonne droite : Coordonnées + Notes ──────────────────── */}
            <div className="bg-card rounded-lg border p-6 space-y-5">
              <h2 className="text-sm font-semibold text-foreground border-b pb-3">
                Coordonnées et notes
              </h2>

              {/* Adresse */}
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  placeholder="Ex : Libreville, Quartier Louis"
                  {...register("address")}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Informations complémentaires sur le client..."
                  className="resize-none"
                  rows={5}
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/clients")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? "Enregistrer les modifications" : "Créer le client"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
