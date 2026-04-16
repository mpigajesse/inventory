import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Save, Palette, Check, Sun, Moon, Monitor } from "lucide-react";
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
    id: 'terracotta',
    label: 'Terracotta',
    description: 'Chaleur africaine',
    palette: {
      primary: 'hsl(22 72% 48%)',
      background: 'hsl(30 20% 97%)',
      accent: 'hsl(152 38% 38%)',
      sidebar: 'hsl(20 30% 10%)',
    },
  },
  {
    id: 'nuit',
    label: 'Nuit',
    description: 'Mode sombre',
    palette: {
      primary: 'hsl(22 72% 56%)',
      background: 'hsl(20 20% 9%)',
      accent: 'hsl(152 42% 44%)',
      sidebar: 'hsl(20 28% 7%)',
    },
  },
  {
    id: 'ocean',
    label: 'Océan',
    description: 'Bleu professionnel',
    palette: {
      primary: 'hsl(210 72% 48%)',
      background: 'hsl(210 20% 98%)',
      accent: 'hsl(175 45% 38%)',
      sidebar: 'hsl(214 30% 12%)',
    },
  },
  {
    id: 'savane',
    label: 'Savane',
    description: 'Doré naturel',
    palette: {
      primary: 'hsl(42 78% 42%)',
      background: 'hsl(40 30% 97%)',
      accent: 'hsl(120 30% 36%)',
      sidebar: 'hsl(35 25% 14%)',
    },
  },
  {
    id: 'foret',
    label: 'Forêt',
    description: 'Vert apaisant',
    palette: {
      primary: 'hsl(145 45% 35%)',
      background: 'hsl(120 15% 97%)',
      accent: 'hsl(38 65% 48%)',
      sidebar: 'hsl(150 30% 10%)',
    },
  },
  {
    id: 'couchant',
    label: 'Couchant',
    description: 'Violet élégant',
    palette: {
      primary: 'hsl(280 55% 52%)',
      background: 'hsl(270 20% 98%)',
      accent: 'hsl(340 65% 55%)',
      sidebar: 'hsl(270 35% 12%)',
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
    id: 'light',
    label: 'Clair',
    icon: <Sun className="w-4 h-4" />,
  },
  {
    id: 'dark',
    label: 'Sombre',
    icon: <Moon className="w-4 h-4" />,
  },
  {
    id: 'system',
    label: 'Système',
    icon: <Monitor className="w-4 h-4" />,
  },
];

export default function SettingsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { theme, setTheme, displayMode, setDisplayMode } = useTheme();

  return (
    <>
      <Topbar title="Paramètres" subtitle="Configuration de l'entreprise et de la caisse" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">
        {/* Appearance */}
        <div className="bg-card rounded-lg border p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Apparence</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6 ml-8">
            Personnalisez les couleurs et le mode d'affichage de l'interface
          </p>

          {/* Theme palette grid */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Thème de couleurs
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
            {THEME_OPTIONS.map((option) => {
              const isActive = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  aria-pressed={isActive}
                  aria-label={`Thème ${option.label}`}
                  className={[
                    'relative flex flex-col items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-[1.03]',
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-muted/40',
                  ].join(' ')}
                >
                  {/* Color dot trio */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-full ring-1 ring-black/10 flex-shrink-0"
                      style={{ backgroundColor: option.palette.primary }}
                      title="Couleur primaire"
                    />
                    <span
                      className="w-5 h-5 rounded-full ring-1 ring-black/10 flex-shrink-0"
                      style={{ backgroundColor: option.palette.sidebar }}
                      title="Couleur sidebar"
                    />
                    <span
                      className="w-5 h-5 rounded-full ring-1 ring-black/10 flex-shrink-0"
                      style={{ backgroundColor: option.palette.accent }}
                      title="Couleur accent"
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[11px] font-semibold leading-tight text-center text-foreground">
                    {option.label}
                  </span>
                  <span className="text-[9px] leading-tight text-center text-muted-foreground hidden sm:block">
                    {option.description}
                  </span>

                  {/* Active checkmark */}
                  {isActive && (
                    <span
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: option.palette.primary }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Display mode */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Mode d'affichage
          </h3>
          <div className="flex flex-wrap gap-2">
            {DISPLAY_MODE_OPTIONS.map((option) => {
              const isActive = displayMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDisplayMode(option.id)}
                  aria-pressed={isActive}
                  className={[
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary text-secondary-foreground hover:border-muted-foreground/40',
                  ].join(' ')}
                >
                  {option.icon}
                  {option.label}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* POS Settings */}
        <div className="bg-card rounded-lg border p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Printer className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Configuration caisse</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Devise</Label>
              <Input defaultValue="FCFA" placeholder="ex: FCFA" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Format ticket</Label>
              <Input defaultValue="80mm" placeholder="ex: 80mm ou 58mm" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Préfixe facture</Label>
              <Input defaultValue="FAC-2026-" placeholder="ex: FAC-2026-" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Message pied de ticket</Label>
              <Input defaultValue="Merci pour votre achat !" placeholder="ex: Merci pour votre achat !" className="mt-1.5" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>
    </>
  );
}
