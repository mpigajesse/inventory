import { useOutletContext, useNavigate, useParams, Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, UserPlus, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Design tokens ────────────────────────────────────────────────────────────

const TERRACOTTA = "hsl(22 72% 48%)";
const TERRACOTTA_LIGHT = "hsl(36 88% 52%)";

// ─── Validation schema ────────────────────────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  email: z.string().email("Email invalide").or(z.literal("")),
  address: z.string().optional(),
  credit_balance: z.coerce.number().min(0, "Le crédit ne peut pas être négatif").optional(),
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
  credit_balance?: number;
  notes: string;
}

const MOCK_CLIENTS: MockClient[] = [
  { id: 1, name: "Jean Mouloungui", phone: "+241 07 12 34 56", email: "jean@email.com", address: "Libreville, Quartier Louis", credit_balance: 0, notes: "" },
  { id: 2, name: "Marie Obiang", phone: "+241 06 78 90 12", email: "", address: "", credit_balance: 15000, notes: "Cliente régulière" },
  { id: 3, name: "Paul Ndong", phone: "+241 07 45 67 89", email: "paul.n@email.com", address: "Libreville, Owendo", credit_balance: 0, notes: "" },
  { id: 4, name: "Sophie Mintsa", phone: "+241 06 23 45 67", email: "", address: "", credit_balance: 0, notes: "" },
  { id: 5, name: "André Nzé", phone: "+241 07 89 01 23", email: "andre.nze@email.com", address: "Libreville, Batterie IV", credit_balance: 45000, notes: "Gros client" },
];

// ─── Premium input component ──────────────────────────────────────────────────

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

function PremiumInput({ label, required, error, hint, ...props }: PremiumInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label
        className="block mb-1.5"
        style={{
          fontWeight: 600,
          fontSize: "13px",
          letterSpacing: "0.01em",
          color: "hsl(var(--foreground))",
        }}
      >
        {label}
        {required && <span style={{ color: "hsl(4 72% 52%)" }} className="ml-0.5"> *</span>}
      </label>
      <input
        ref={inputRef}
        className="w-full outline-none bg-card text-sm"
        style={{
          height: "48px",
          padding: "0 16px",
          borderRadius: "12px",
          border: `1.5px solid ${focused ? "hsl(22 72% 48%)" : error ? "hsl(4 72% 52%)" : "hsl(var(--border))"}`,
          boxShadow: focused
            ? `0 0 0 3px hsl(22 72% 48% / 0.15)`
            : error
            ? `0 0 0 3px hsl(4 72% 52% / 0.1)`
            : "none",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: "hsl(4 72% 52%)" }}>{error}</p>
      )}
    </div>
  );
}

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
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          phone: client.phone,
          email: client.email,
          address: client.address ?? "",
          credit_balance: client.credit_balance ?? 0,
          notes: client.notes,
        }
      : {
          name: "",
          phone: "",
          email: "",
          address: "",
          credit_balance: 0,
          notes: "",
        },
  });

  const creditBalanceValue = watch("credit_balance") ?? 0;
  const hasCredit = Number(creditBalanceValue) > 0;

  function onSubmit(values: ClientFormValues) {
    setIsSubmitting(true);
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

        {/* ── Breadcrumb + titre ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Link
            to="/clients"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-all px-2.5 py-1.5"
            style={{
              borderRadius: "10px",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "hsl(22 72% 48% / 0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Clients
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{pageTitle}</span>
        </div>

        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(22 72% 48% / 0.12), hsl(36 88% 52% / 0.12))`,
              border: `1.5px solid hsl(22 72% 48% / 0.2)`,
            }}
          >
            <UserPlus className="w-5 h-5" style={{ color: TERRACOTTA }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground leading-tight" style={{ letterSpacing: "-0.02em" }}>
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

            {/* ── Colonne gauche : Informations personnelles ─────────── */}
            <div
              className="space-y-5"
              style={{
                background: "hsl(var(--card))",
                border: "1.5px solid hsl(var(--border))",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                animation: "slideInUp 0.35s ease forwards",
                animationDelay: "0ms",
                opacity: 0,
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.14em] pb-3 border-b border-border/60"
                style={{ color: TERRACOTTA }}
              >
                Informations personnelles
              </p>

              <PremiumInput
                label="Nom complet"
                required
                placeholder="Ex : Jean Mouloungui"
                error={errors.name?.message}
                {...register("name")}
              />

              <PremiumInput
                label="Téléphone"
                required
                placeholder="+241 07 XX XX XX"
                type="tel"
                error={errors.phone?.message}
                {...register("phone")}
              />

              <PremiumInput
                label="Adresse email"
                placeholder="exemple@email.com"
                type="email"
                error={errors.email?.message}
                hint="Optionnel — utilisé pour les factures par email"
                {...register("email")}
              />
            </div>

            {/* ── Colonne droite : Coordonnées + Crédit + Notes ───────── */}
            <div
              className="space-y-5"
              style={{
                background: "hsl(var(--card))",
                border: "1.5px solid hsl(var(--border))",
                borderRadius: "20px",
                padding: "24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                animation: "slideInUp 0.35s ease forwards",
                animationDelay: "80ms",
                opacity: 0,
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-[0.14em] pb-3 border-b border-border/60"
                style={{ color: TERRACOTTA }}
              >
                Coordonnées et notes
              </p>

              <PremiumInput
                label="Adresse"
                placeholder="Ex : Libreville, Quartier Louis"
                {...register("address")}
              />

              {/* Crédit dû — champ spécial avec alerte si > 0 */}
              <div>
                <label
                  className="flex items-center gap-1.5 mb-1.5"
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    letterSpacing: "0.01em",
                    color: hasCredit ? "hsl(36 88% 42%)" : "hsl(var(--foreground))",
                    transition: "color 0.3s ease",
                  }}
                >
                  {hasCredit && (
                    <AlertCircle
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: "hsl(36 88% 42%)" }}
                    />
                  )}
                  Crédit accordé
                  <span
                    className="text-xs font-normal"
                    style={{
                      color: hasCredit ? "hsl(36 88% 52% / 0.7)" : "hsl(var(--muted-foreground))",
                    }}
                  >(FCFA)</span>
                </label>
                <CreditInput
                  hasCredit={hasCredit}
                  error={errors.credit_balance?.message}
                  registration={register("credit_balance")}
                />
                {hasCredit && (
                  <div
                    className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: "hsl(36 88% 52% / 0.08)",
                      border: "1px solid hsl(36 88% 52% / 0.2)",
                      color: "hsl(28 75% 38%)",
                      animation: "slideInUp 0.25s ease forwards",
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Ce client a un solde crédit non réglé. Vérifiez avant validation.</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label
                  className="block mb-1.5"
                  style={{
                    fontWeight: 600,
                    fontSize: "13px",
                    letterSpacing: "0.01em",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Notes
                </label>
                <div className="relative">
                  <Textarea
                    id="notes"
                    placeholder="Informations complémentaires sur le client..."
                    className="resize-none min-h-[100px] text-sm bg-card outline-none"
                    style={{
                      borderRadius: "12px",
                      border: "1.5px solid hsl(var(--border))",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "hsl(22 72% 48%)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px hsl(22 72% 48% / 0.15)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "hsl(var(--border))";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    rows={4}
                    {...register("notes")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 justify-end pt-6 border-t border-border mt-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border border-border bg-card hover:bg-muted transition-colors disabled:opacity-50"
              onClick={() => navigate("/clients")}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4" />
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 text-sm font-semibold text-white disabled:opacity-60 hover:brightness-110 active:scale-95"
              style={{
                height: "52px",
                borderRadius: "14px",
                background: `linear-gradient(135deg, ${TERRACOTTA}, ${TERRACOTTA_LIGHT})`,
                boxShadow: `0 4px 16px hsl(22 72% 48% / 0.40), 0 1px 4px hsl(22 72% 48% / 0.20)`,
                transition: "transform 0.15s ease, box-shadow 0.2s ease, filter 0.15s ease",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? "Enregistrer les modifications" : "Créer le client"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Credit input with focus state ───────────────────────────────────────────

interface CreditInputProps {
  hasCredit: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
}

function CreditInput({ hasCredit, error, registration }: CreditInputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? "hsl(4 72% 52%)"
    : focused
    ? "hsl(22 72% 48%)"
    : hasCredit
    ? "hsl(36 88% 52%)"
    : "hsl(var(--border))";

  const shadow = focused
    ? "0 0 0 3px hsl(22 72% 48% / 0.15)"
    : hasCredit && !focused
    ? "0 0 0 2px hsl(36 88% 52% / 0.12)"
    : "none";

  return (
    <>
      <input
        type="number"
        min={0}
        step={100}
        className="w-full text-sm outline-none"
        style={{
          height: "48px",
          padding: "0 16px",
          borderRadius: "12px",
          border: `1.5px solid ${borderColor}`,
          boxShadow: shadow,
          background: hasCredit ? "hsl(36 88% 52% / 0.05)" : "hsl(var(--card))",
          transition: "border-color 0.3s ease, background 0.3s ease, box-shadow 0.2s ease",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...registration}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: "hsl(4 72% 52%)" }}>{error}</p>
      )}
    </>
  );
}
