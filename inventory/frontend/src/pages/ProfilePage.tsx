import { useOutletContext } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  User,
  Shield,
  KeyRound,
  Settings2,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Camera,
  Mail,
  ShoppingBag,
  Info,
} from "lucide-react";
import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { userService } from "@/services/userService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const SECTION_CARD_CLASSES =
  "relative bg-card rounded-xl border border-border/70 shadow-[0_1px_2px_rgba(120,60,20,0.04),0_8px_24px_-12px_rgba(120,60,20,0.10)] overflow-hidden mb-6";

const FIELD_LABEL_CLASSES =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]";

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

function SectionHeader({ icon, title, description }: SectionHeaderProps) {
  return (
    <header className="flex items-start gap-3 mb-5">
      <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold leading-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
    </header>
  );
}

// ─── Avatar header (identity card) ───────────────────────────────────────────

function IdentityCard() {
  const { currentUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = getInitials(currentUser?.name ?? "");
  const isAdmin = currentUser?.role === "admin";

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      toast({ title: "Photo de profil chargée (non envoyée au serveur)." });
    };
    reader.readAsDataURL(file);
  }

  return (
    <section
      className={`${SECTION_CARD_CLASSES}`}
      aria-labelledby="profile-identity-title"
    >
      <div
        className="h-20 sm:h-24"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.22) 0%, hsl(var(--accent) / 0.16) 55%, hsl(var(--primary) / 0.10) 100%)",
          backgroundSize: "200% 200%",
          animation: "gradientPulse 4s ease-in-out infinite",
        }}
        aria-hidden="true"
      />
      <div className="px-5 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
          {/* Avatar */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="group relative block w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-card shadow-[0_8px_28px_-12px_rgba(120,60,20,0.45)] overflow-hidden focus-visible:outline-none focus-visible:ring-primary"
              aria-label="Changer la photo de profil"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="flex items-center justify-center w-full h-full text-3xl sm:text-4xl font-bold text-primary-foreground"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)",
                  }}
                >
                  {initials}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
                <Camera className="w-6 h-6 text-background" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                id="profile-identity-title"
                className="text-xl sm:text-2xl font-semibold text-foreground leading-tight truncate"
              >
                {currentUser?.name || "Utilisateur"}
              </h1>
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                  isAdmin
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "bg-accent/15 text-accent-foreground ring-1 ring-accent/25",
                ].join(" ")}
              >
                {isAdmin ? (
                  <Shield className="w-3 h-3" />
                ) : (
                  <ShoppingBag className="w-3 h-3" />
                )}
                {isAdmin ? "Admin" : "Vendeur"}
              </span>
            </div>
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Mail className="w-3.5 h-3.5" />
              {currentUser?.email || "—"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { currentUser, setCurrentUser } = useAuth();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => userService.updateMe(data),
    onSuccess: (updatedUser) => {
      setCurrentUser({
        id: String(updatedUser.id),
        name: updatedUser.full_name || updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.profile.role,
        avatar: updatedUser.profile.avatar_url || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Profil mis à jour avec succès." });
    },
    onError: () => {
      toast({
        title: "Erreur lors de la mise à jour",
        description: "Vérifiez les informations saisies.",
        variant: "destructive",
      });
    },
  });

  const nameParts = (currentUser?.name ?? "").split(" ");
  const defaultFirstName = nameParts[0] ?? "";
  const defaultLastName = nameParts.slice(1).join(" ");

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: defaultFirstName,
      last_name: defaultLastName,
      email: currentUser?.email ?? "",
    },
  });

  function onSubmit(values: ProfileFormValues) {
    updateMutation.mutate(values);
  }

  return (
    <section className={SECTION_CARD_CLASSES} aria-labelledby="profile-account-title">
      <div className="border-l-4 border-primary pl-5 pr-5 sm:pl-6 sm:pr-6 py-5 sm:py-6">
        <div id="profile-account-title">
          <SectionHeader
            icon={<User className="w-5 h-5" />}
            title="Informations personnelles"
            description="Mettez à jour votre nom et votre email pour identifier vos actions."
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="profile-first-name" className={FIELD_LABEL_CLASSES}>
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-first-name"
                placeholder="Ex : Jean"
                className="h-11 rounded-lg transition-all duration-200 focus-visible:ring-primary/60"
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-last-name" className={FIELD_LABEL_CLASSES}>
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-last-name"
                placeholder="Ex : Mouloungui"
                className="h-11 rounded-lg transition-all duration-200 focus-visible:ring-primary/60"
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="profile-email" className={FIELD_LABEL_CLASSES}>
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="profile-email"
                type="email"
                placeholder="exemple@naoservices.ga"
                className="h-11 rounded-lg transition-all duration-200 focus-visible:ring-primary/60"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || updateMutation.isPending}
              onClick={() => reset()}
              className="min-h-[44px] rounded-lg"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)]"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

// ─── Security section ─────────────────────────────────────────────────────────

function SecuritySection() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      userService.changePassword(current, next),
    onSuccess: () => {
      reset();
      toast({ title: "Mot de passe modifié avec succès." });
    },
    onError: () => {
      toast({
        title: "Échec du changement de mot de passe",
        description: "Le mot de passe actuel est peut-être incorrect.",
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  function onSubmit(values: PasswordFormValues) {
    changePasswordMutation.mutate({ current: values.current, next: values.next });
  }

  return (
    <section className={SECTION_CARD_CLASSES} aria-labelledby="profile-security-title">
      <div className="border-l-4 border-primary pl-5 pr-5 sm:pl-6 sm:pr-6 py-5 sm:py-6">
        <div id="profile-security-title">
          <SectionHeader
            icon={<KeyRound className="w-5 h-5" />}
            title="Sécurité"
            description="Changez votre mot de passe régulièrement pour protéger votre compte."
          />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="pwd-current" className={FIELD_LABEL_CLASSES}>
              Mot de passe actuel <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="pwd-current"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="••••••••"
                className="h-11 rounded-lg pr-11 transition-all duration-200 focus-visible:ring-primary/60"
                {...register("current")}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={showCurrentPassword ? "Masquer" : "Afficher"}
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.current && (
              <p className="text-xs text-destructive mt-1">{errors.current.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="pwd-next" className={FIELD_LABEL_CLASSES}>
                Nouveau mot de passe <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="pwd-next"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 rounded-lg pr-11 transition-all duration-200 focus-visible:ring-primary/60"
                  {...register("next")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label={showNewPassword ? "Masquer" : "Afficher"}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.next && (
                <p className="text-xs text-destructive mt-1">{errors.next.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pwd-confirm" className={FIELD_LABEL_CLASSES}>
                Confirmer <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="pwd-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-11 rounded-lg pr-11 transition-all duration-200 focus-visible:ring-primary/60"
                  {...register("confirm")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label={showConfirmPassword ? "Masquer" : "Afficher"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-xs text-destructive mt-1">{errors.confirm.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="outline"
              disabled={changePasswordMutation.isPending}
              className="min-h-[44px] rounded-lg border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              {changePasswordMutation.isPending
                ? "Modification…"
                : "Changer le mot de passe"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

// ─── Preferences section ──────────────────────────────────────────────────────

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
    <section className={SECTION_CARD_CLASSES} aria-labelledby="profile-preferences-title">
      <div className="border-l-4 border-primary pl-5 pr-5 sm:pl-6 sm:pr-6 py-5 sm:py-6">
        <div id="profile-preferences-title">
          <SectionHeader
            icon={<Settings2 className="w-5 h-5" />}
            title="Préférences"
            description="Langue de l'interface et fuseau horaire par défaut."
          />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        >
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASSES}>Langue de l'interface</Label>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-11 rounded-lg">
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
            <Label className={FIELD_LABEL_CLASSES}>Fuseau horaire</Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Fuseau horaire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Libreville">
                      Africa/Libreville (UTC+1)
                    </SelectItem>
                    <SelectItem value="Africa/Lagos">Africa/Lagos (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris (UTC+1/+2)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <Button
              type="submit"
              variant="outline"
              className="min-h-[44px] rounded-lg border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {saved ? "Préférences sauvegardées !" : "Sauvegarder"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

// ─── Vendeur info banner ──────────────────────────────────────────────────────

function VendeurInfoBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3.5 mb-6"
      style={{
        background: "hsl(var(--accent) / 0.08)",
        borderColor: "hsl(var(--accent) / 0.25)",
      }}
      role="note"
      aria-label="Information sur le rôle"
    >
      <span
        className="mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
        style={{
          background: "hsl(var(--accent) / 0.15)",
          color: "hsl(var(--accent-foreground))",
        }}
      >
        <Info className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-snug">
          Votre rôle : Vendeur
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Contactez un administrateur pour modifier vos permissions ou accéder aux paramètres avancés.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { currentUser } = useAuth();
  const isVendeur = currentUser?.role === "vendeur";

  return (
    <>
      <Topbar
        title="Mon Profil"
        subtitle="Informations personnelles et sécurité du compte"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">
        <IdentityCard />
        {isVendeur && <VendeurInfoBanner />}
        <ProfileSection />
        <SecuritySection />
        <PermissionGate permission="manage_settings">
          <PreferencesSection />
        </PermissionGate>
      </div>
    </>
  );
}
