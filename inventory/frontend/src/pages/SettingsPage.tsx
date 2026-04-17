import { useOutletContext } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Save,
  Palette,
  Check,
  Sun,
  Moon,
  Monitor,
  X,
  Loader2,
} from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme, DisplayMode } from "@/contexts/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { api } from "@/lib/api";

interface ThemeOption {
  id: Theme;
  label: string;
  description: string;
  palette: {
    primary: string;
    background: string;
    accent: string;
    sidebar: string;
  };
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "terracotta",
    label: "Terracotta",
    description: "Chaleur africaine",
    palette: {
      primary: "hsl(22 72% 48%)",
      background: "hsl(30 20% 97%)",
      accent: "hsl(152 38% 38%)",
      sidebar: "hsl(20 30% 10%)",
    },
  },
  {
    id: "nuit",
    label: "Nuit",
    description: "Mode sombre",
    palette: {
      primary: "hsl(22 72% 56%)",
      background: "hsl(20 20% 9%)",
      accent: "hsl(152 42% 44%)",
      sidebar: "hsl(20 28% 7%)",
    },
  },
  {
    id: "ocean",
    label: "Océan",
    description: "Bleu professionnel",
    palette: {
      primary: "hsl(210 72% 48%)",
      background: "hsl(210 20% 98%)",
      accent: "hsl(175 45% 38%)",
      sidebar: "hsl(214 30% 12%)",
    },
  },
  {
    id: "savane",
    label: "Savane",
    description: "Doré naturel",
    palette: {
      primary: "hsl(42 78% 42%)",
      background: "hsl(40 30% 97%)",
      accent: "hsl(120 30% 36%)",
      sidebar: "hsl(35 25% 14%)",
    },
  },
  {
    id: "foret",
    label: "Forêt",
    description: "Vert apaisant",
    palette: {
      primary: "hsl(145 45% 35%)",
      background: "hsl(120 15% 97%)",
      accent: "hsl(38 65% 48%)",
      sidebar: "hsl(150 30% 10%)",
    },
  },
  {
    id: "couchant",
    label: "Couchant",
    description: "Violet élégant",
    palette: {
      primary: "hsl(280 55% 52%)",
      background: "hsl(270 20% 98%)",
      accent: "hsl(340 65% 55%)",
      sidebar: "hsl(270 35% 12%)",
    },
  },
];

interface DisplayModeOption {
  id: DisplayMode;
  label: string;
  icon: React.ReactNode;
}

const DISPLAY_MODE_OPTIONS: DisplayModeOption[] = [
  { id: "light", label: "Clair", icon: <Sun className="w-4 h-4" /> },
  { id: "dark", label: "Sombre", icon: <Moon className="w-4 h-4" /> },
  { id: "system", label: "Système", icon: <Monitor className="w-4 h-4" /> },
];

// ─── POS settings schema ──────────────────────────────────────────────────────

const posSettingsSchema = z.object({
  currency: z.string().min(1, "La devise est requise"),
  ticket_format: z.string().min(1, "Le format est requis"),
  invoice_prefix: z.string().min(1, "Le préfixe est requis"),
  ticket_footer: z.string(),
});

type PosSettingsFormValues = z.infer<typeof posSettingsSchema>;

// ─── Premium section card ─────────────────────────────────────────────────────

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  animationDelay?: string;
}

function SettingsSection({
  icon,
  title,
  description,
  children,
  animationDelay,
}: SettingsSectionProps) {
  return (
    <section
      className="rounded-2xl overflow-hidden mb-5 animate-fade-scale opacity-0"
      style={{
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 2px 10px hsl(22 30% 15% / 0.07)",
        animationFillMode: "forwards",
        animationDelay: animationDelay ?? "0ms",
      }}
      aria-labelledby={`section-${title}`}
    >
      {/* Header strip */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{ background: "hsl(var(--muted))" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
            boxShadow: "0 2px 8px hsl(22 72% 48% / 0.30)",
          }}
        >
          <span className="text-white [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        </div>
        <div className="min-w-0">
          <h2
            id={`section-${title}`}
            className="font-bold text-sm text-foreground leading-tight"
          >
            {title}
          </h2>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5" style={{ background: "hsl(var(--card))" }}>
        {children}
      </div>
    </section>
  );
}

const DEFAULT_POS_SETTINGS: PosSettingsFormValues = {
  currency: "FCFA",
  ticket_format: "80mm",
  invoice_prefix: "FAC-2026-",
  ticket_footer: "Merci pour votre achat !",
};

const FIELD_LABEL_CLASSES =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]";

export default function SettingsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { theme, setTheme, displayMode, setDisplayMode } = useTheme();
  const { can } = usePermissions();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PosSettingsFormValues>({
    resolver: zodResolver(posSettingsSchema),
    defaultValues: DEFAULT_POS_SETTINGS,
  });

  const saveMutation = useMutation({
    mutationFn: (data: PosSettingsFormValues) =>
      api.patch("/settings/pos/", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Paramètres enregistrés avec succès.");
    },
    onError: () => {
      toast.error("Erreur lors de la sauvegarde des paramètres.");
    },
  });

  function onSubmit(values: PosSettingsFormValues) {
    saveMutation.mutate(values);
  }

  if (!can("manage_settings")) {
    return (
      <AccessDenied message="Vous n'avez pas la permission d'accéder à ces paramètres." />
    );
  }

  return (
    <>
      <Topbar
        title="Paramètres"
        subtitle="Configuration de l'entreprise et de la caisse"
        onMenuClick={onMenuClick}
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="page-container animate-slide-in pb-32 sm:pb-6">

          {/* ── Apparence ── */}
          <SettingsSection
            icon={<Palette />}
            title="Apparence"
            description="Personnalisez les couleurs et le mode d'affichage de l'interface."
            animationDelay="80ms"
          >
            {/* Theme palette grid */}
            <h3 className={`${FIELD_LABEL_CLASSES} mb-3`}>Thème de couleurs</h3>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-7"
              role="radiogroup"
              aria-label="Thème de couleurs"
            >
              {THEME_OPTIONS.map((option) => {
                const isActive = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTheme(option.id)}
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`Thème ${option.label}`}
                    className={[
                      "group relative flex flex-col items-center gap-3 p-4 min-h-[112px] rounded-xl border-2 bg-card transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "border-primary shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.45)] bg-primary/[0.04]"
                        : "border-border hover:border-primary/50 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5",
                    ].join(" ")}
                  >
                    {/* Color swatch */}
                    <div className="relative">
                      <span
                        className="block w-12 h-12 rounded-full ring-1 ring-black/10 shadow-sm"
                        style={{
                          background: `conic-gradient(from 210deg, ${option.palette.primary} 0 45%, ${option.palette.sidebar} 45% 75%, ${option.palette.accent} 75% 100%)`,
                        }}
                        aria-hidden="true"
                      />
                      {isActive && (
                        <span
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-card"
                          style={{ backgroundColor: "hsl(var(--primary))" }}
                        >
                          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                        </span>
                      )}
                    </div>

                    <div className="text-center">
                      <span className="block text-sm font-semibold leading-tight text-foreground">
                        {option.label}
                      </span>
                      <span className="block text-[11px] leading-tight text-muted-foreground mt-0.5">
                        {option.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Display mode */}
            <h3 className={`${FIELD_LABEL_CLASSES} mb-3`}>Mode d'affichage</h3>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Mode d'affichage"
            >
              {DISPLAY_MODE_OPTIONS.map((option) => {
                const isActive = displayMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDisplayMode(option.id)}
                    role="radio"
                    aria-checked={isActive}
                    className={[
                      "inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl border-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--primary)/0.6)]"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/[0.04]",
                    ].join(" ")}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* ── Configuration caisse ── */}
          <SettingsSection
            icon={<Printer />}
            title="Configuration caisse"
            description="Paramètres de facturation, impression de ticket et numérotation."
            animationDelay="220ms"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="settings-currency" className={FIELD_LABEL_CLASSES}>
                  Devise
                </Label>
                <Input
                  id="settings-currency"
                  placeholder="ex : FCFA"
                  className="h-11 rounded-lg"
                  {...register("currency")}
                />
                {errors.currency && (
                  <p className="text-xs text-destructive">{errors.currency.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-ticket" className={FIELD_LABEL_CLASSES}>
                  Format ticket
                </Label>
                <Input
                  id="settings-ticket"
                  placeholder="ex : 80mm ou 58mm"
                  className="h-11 rounded-lg"
                  {...register("ticket_format")}
                />
                {errors.ticket_format && (
                  <p className="text-xs text-destructive">{errors.ticket_format.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-prefix" className={FIELD_LABEL_CLASSES}>
                  Préfixe facture
                </Label>
                <Input
                  id="settings-prefix"
                  placeholder="ex : FAC-2026-"
                  className="h-11 rounded-lg"
                  {...register("invoice_prefix")}
                />
                {errors.invoice_prefix && (
                  <p className="text-xs text-destructive">{errors.invoice_prefix.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-footer" className={FIELD_LABEL_CLASSES}>
                  Message pied de ticket
                </Label>
                <Input
                  id="settings-footer"
                  placeholder="ex : Merci pour votre achat !"
                  className="h-11 rounded-lg"
                  {...register("ticket_footer")}
                />
              </div>
            </div>
          </SettingsSection>

          {/* ── Sticky save bar ── */}
          <div className="sticky bottom-0 -mx-4 sm:mx-0 sm:static sm:rounded-2xl backdrop-blur-md bg-card/80 supports-[backdrop-filter]:bg-card/75 border-t sm:border sm:border-border/70 shadow-[0_-8px_24px_-12px_rgba(120,60,20,0.15)] sm:shadow-none px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isSubmitting || saveMutation.isPending}
              onClick={() => reset()}
              className="min-h-[44px] rounded-xl border-border/80"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <button
              type="submit"
              disabled={isSubmitting || saveMutation.isPending}
              className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl font-semibold text-sm text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
              }}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saveMutation.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
