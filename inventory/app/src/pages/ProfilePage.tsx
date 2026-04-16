import { useOutletContext } from "react-router-dom";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { User, Shield, KeyRound, Settings2, Save, Clock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types & Schemas ──────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide").or(z.literal("")),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Le mot de passe actuel est requis"),
    next: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
    confirm: z.string().min(1, "Veuillez confirmer le mot de passe"),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

const preferencesSchema = z.object({
  language: z.enum(["fr"]),
  timezone: z.enum(["Africa/Libreville", "Africa/Lagos", "Europe/Paris", "UTC"]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type PreferencesFormValues = z.infer<typeof preferencesSchema>;

// ─── Mock current user ────────────────────────────────────────────────────────

const CURRENT_USER = {
  name: "Admin Principal",
  email: "admin@naoservices.ga",
  phone: "+241 07 40 13 02",
  role: "admin" as const,
  lastLogin: "Aujourd'hui à 08:30",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function ProfileSection() {
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: CURRENT_USER.name,
      email: CURRENT_USER.email,
      phone: CURRENT_USER.phone,
    },
  });

  function onSubmit(_values: ProfileFormValues) {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-card rounded-lg border p-5 sm:p-6 mb-6">
      {/* Avatar + identity */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0">
          {getInitials(CURRENT_USER.name)}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold">{CURRENT_USER.name}</p>
            <StatusBadge
              label={CURRENT_USER.role === "admin" ? "Admin" : "Vendeur"}
              variant={CURRENT_USER.role === "admin" ? "info" : "default"}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Dernière connexion : {CURRENT_USER.lastLogin}</span>
          </div>
        </div>
      </div>

      {/* Form header */}
      <div className="flex items-center gap-3 mb-4">
        <User className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Mon compte</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">
              Nom complet <span className="text-destructive">*</span>
            </Label>
            <Input id="profile-name" placeholder="Ex : Jean Mouloungui" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">Téléphone</Label>
            <Input id="profile-phone" placeholder="+241 07 XX XX XX" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-email"
              type="email"
              placeholder="exemple@naoservices.ga"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            {saved ? "Enregistré !" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SecuritySection() {
  const [saved, setSaved] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  function onSubmit(_values: PasswordFormValues) {
    setSaved(true);
    reset();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-card rounded-lg border p-5 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <KeyRound className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Sécurité</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pwd-current">
            Mot de passe actuel <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="pwd-current"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("current")}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showCurrentPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.current && (
            <p className="text-xs text-destructive">{errors.current.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pwd-next">
            Nouveau mot de passe <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="pwd-next"
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("next")}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.next && (
            <p className="text-xs text-destructive">{errors.next.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pwd-confirm">
            Confirmer le nouveau mot de passe <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="pwd-confirm"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirm")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirm && (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            {saved ? "Mot de passe modifié !" : "Changer le mot de passe"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PreferencesSection() {
  const [saved, setSaved] = useState(false);

  const { handleSubmit, control } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: "fr",
      timezone: "Africa/Libreville",
    },
  });

  function onSubmit(_values: PreferencesFormValues) {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-card rounded-lg border p-5 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Préférences</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Langue de l'interface</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fuseau horaire</Label>
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Fuseau horaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Libreville">Africa/Libreville (UTC+1)</SelectItem>
                  <SelectItem value="Africa/Lagos">Africa/Lagos (UTC+1)</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (UTC+1/+2)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="outline">
            <Save className="w-4 h-4 mr-2" />
            {saved ? "Préférences sauvegardées !" : "Sauvegarder"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();

  return (
    <>
      <Topbar
        title="Mon Profil"
        subtitle="Informations personnelles et sécurité du compte"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">
        <ProfileSection />
        <SecuritySection />
        <PreferencesSection />
      </div>
    </>
  );
}
