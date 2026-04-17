import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Save, Palette, Check, Sun, Moon, Monitor, X } from "lucide-react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme, DisplayMode } from "@/contexts/ThemeContext";

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
  {
    id: "light",
    label: "Clair",
    icon: <Sun className="w-4 h-4" />,
  },
  {
    id: "dark",
    label: "Sombre",
    icon: <Moon className="w-4 h-4" />,
  },
  {
    id: "system",
    label: "Système",
    icon: <Monitor className="w-4 h-4" />,
  },
];

// ─── Section wrapper ─────────────────────────────────────────────────────────

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <section
      className="relative bg-card rounded-xl border border-border/70 shadow-[0_1px_2px_rgba(120,60,20,0.04),0_8px_24px_-12px_rgba(120,60,20,0.10)] overflow-hidden mb-6"
      aria-labelledby={`section-${title}`}
    >
      <div className="border-l-4 border-primary pl-5 pr-5 sm:pl-6 sm:pr-6 py-5 sm:py-6">
        <header className="flex items-start gap-3 mb-5">
          <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <h2
              id={`section-${title}`}
              className="text-base sm:text-lg font-semibold leading-tight text-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {description}
              </p>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { theme, setTheme, displayMode, setDisplayMode } = useTheme();

  return (
    <>
      <Topbar
        title="Paramètres"
        subtitle="Configuration de l'entreprise et de la caisse"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in pb-32 sm:pb-6">
        {/* Appearance */}
        <SettingsSection
          icon={<Palette className="w-5 h-5" />}
          title="Apparence"
          description="Personnalisez les couleurs et le mode d'affichage de l'interface."
        >
          {/* Theme palette grid */}
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-3">
            Thème de couleurs
          </h3>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
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
                      : "border-border hover:border-primary/50 hover:shadow-[0_4px_14px_-10px_rgba(0,0,0,0.25)] hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  {/* Big circular color preview */}
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

                  {/* Label */}
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
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-3">
            Mode d'affichage
          </h3>
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

        {/* POS Settings */}
        <SettingsSection
          icon={<Printer className="w-5 h-5" />}
          title="Configuration caisse"
          description="Paramètres de facturation, impression de ticket et numérotation."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="settings-currency"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]"
              >
                Devise
              </Label>
              <Input
                id="settings-currency"
                defaultValue="FCFA"
                placeholder="ex : FCFA"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="settings-ticket"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]"
              >
                Format ticket
              </Label>
              <Input
                id="settings-ticket"
                defaultValue="80mm"
                placeholder="ex : 80mm ou 58mm"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="settings-prefix"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]"
              >
                Préfixe facture
              </Label>
              <Input
                id="settings-prefix"
                defaultValue="FAC-2026-"
                placeholder="ex : FAC-2026-"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="settings-footer"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]"
              >
                Message pied de ticket
              </Label>
              <Input
                id="settings-footer"
                defaultValue="Merci pour votre achat !"
                placeholder="ex : Merci pour votre achat !"
                className="h-11 rounded-lg"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Sticky save bar */}
        <div
          className="sticky bottom-0 -mx-4 sm:mx-0 sm:static sm:rounded-xl bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-t sm:border sm:border-border/70 shadow-[0_-8px_24px_-12px_rgba(120,60,20,0.12)] sm:shadow-none px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3"
        >
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] rounded-lg border-border/80"
          >
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)]"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </>
  );
}
