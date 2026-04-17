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
  Lock,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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

const FIELD_LABEL_CLASSES =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]";

// ─── Hero Profil ──────────────────────────────────────────────────────────────

function IdentityCard() {
  const { currentUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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
      toast.info("Photo de profil chargée (non envoyée au serveur).");
    };
    reader.readAsDataURL(file);
  }

  return (
    <section
      className="relative overflow-hidden mb-6"
      style={{
        background: "linear-gradient(135deg, hsl(20 32% 7%), hsl(22 26% 13%), hsl(20 22% 10%))",
        border: "1px solid hsl(22 72% 48% / 0.15)",
        borderRadius: "24px",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      aria-labelledby="profile-identity-title"
    >
      {/* Diagonal stripe pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "24px",
          opacity: 0.06,
          backgroundImage:
            "repeating-linear-gradient(45deg, hsl(22 72% 48%) 0px, hsl(22 72% 48%) 1px, transparent 1px, transparent 15px)",
        }}
        aria-hidden="true"
      />

      {/* Radial orb top-right */}
      <div
        className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(22 72% 48% / 0.18) 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
        aria-hidden="true"
      />

      {/* Radial orb bottom-left */}
      <div
        className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(36 88% 52% / 0.10) 0%, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
        aria-hidden="true"
      />

      <div className="relative px-6 pt-6 pb-7 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Avatar with upload overlay */}
        <div className="relative shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              boxShadow: "0 8px 20px hsl(22 72% 48% / 0.35), 0 0 0 3px hsl(22 26% 14%)",
            }}
            aria-label="Changer la photo de profil"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span
                className="flex items-center justify-center w-full h-full text-2xl sm:text-3xl font-extrabold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                }}
              >
                {initials}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200" style={{ background: "rgba(0,0,0,0.55)", borderRadius: "18px" }}>
              <Camera className="w-6 h-6 text-white" />
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

        {/* Identity info */}
        <div className="flex-1 min-w-0">
          <h1
            id="profile-identity-title"
            className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate"
          >
            {currentUser?.name || "Utilisateur"}
          </h1>
          <p className="inline-flex items-center gap-1.5 text-white/50 text-sm mt-0.5">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            {currentUser?.email || "—"}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "hsl(22 72% 80%)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "100px",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {isAdmin ? <Shield className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
              {isAdmin ? "Administrateur" : "Vendeur·se"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Premium section card wrapper ────────────────────────────────────────────

interface PremiumSectionProps {
  icon: React.ReactNode;
  iconGradient?: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  tinted?: boolean;
  animationStyle?: React.CSSProperties;
}

function PremiumSection({
  icon,
  iconGradient = false,
  title,
  description,
  children,
  tinted = false,
  animationStyle,
}: PremiumSectionProps) {
  return (
    <section
      className="overflow-hidden mb-5"
      style={{
        background: tinted ? "hsl(36 88% 52% / 0.04)" : "hsl(var(--card))",
        border: tinted
          ? "1px solid hsl(36 88% 52% / 0.22)"
          : "1px solid hsl(var(--border))",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        ...animationStyle,
      }}
    >
      {/* Section header strip */}
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{ background: tinted ? "hsl(36 88% 52% / 0.06)" : "hsl(var(--muted))" }}
      >
        <div
          className="w-7 h-7 flex items-center justify-center flex-shrink-0"
          style={
            iconGradient
              ? {
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  boxShadow: "0 2px 8px hsl(22 72% 48% / 0.35)",
                }
              : {
                  borderRadius: "12px",
                  background: tinted
                    ? "hsl(36 88% 52% / 0.15)"
                    : "hsl(22 72% 48% / 0.12)",
                }
          }
        >
          <span
            style={{
              color: tinted ? "hsl(36 72% 42%)" : iconGradient ? "white" : "hsl(22 72% 48%)",
            }}
            className="[&>svg]:w-3.5 [&>svg]:h-3.5"
          >
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-sm text-foreground leading-tight">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
          )}
        </div>
      </div>

      {/* Section body */}
      <div className="px-5 py-5">{children}</div>
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
      toast.success("Profil mis à jour avec succès.");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour. Vérifiez les informations saisies.");
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
    <PremiumSection
      icon={<User />}
      iconGradient
      title="Informations personnelles"
      description="Mettez à jour votre nom et votre adresse email."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-first-name" className={FIELD_LABEL_CLASSES}>
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-first-name"
              placeholder="Ex : Jean"
              className="rounded-xl transition-all duration-200 focus-visible:ring-[hsl(22_72%_48%/0.5)]"
              style={{ height: "48px", borderRadius: "12px" }}
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
              className="rounded-xl transition-all duration-200 focus-visible:ring-[hsl(22_72%_48%/0.5)]"
              style={{ height: "48px", borderRadius: "12px" }}
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
              className="rounded-xl transition-all duration-200 focus-visible:ring-[hsl(22_72%_48%/0.5)]"
              style={{ height: "48px", borderRadius: "12px" }}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-1">
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
            className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)] active:scale-[0.97]"
            style={{ transition: "transform 0.15s ease, box-shadow 0.2s ease" }}
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
    </PremiumSection>
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
      toast.success("Mot de passe modifié avec succès.");
    },
    onError: () => {
      toast.error("Échec du changement de mot de passe. Le mot de passe actuel est peut-être incorrect.");
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
    <PremiumSection
      icon={<Lock />}
      title="Sécurité du compte"
      description="Changez votre mot de passe pour protéger votre accès."
      tinted
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pwd-current" className={FIELD_LABEL_CLASSES}>
            Mot de passe actuel <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="pwd-current"
              type={showCurrentPassword ? "text" : "password"}
              placeholder="••••••••"
              className="rounded-xl pr-11 transition-all duration-200 focus-visible:ring-[hsl(22_72%_48%/0.5)]"
              style={{ height: "48px", borderRadius: "12px" }}
              {...register("current")}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                style={{ transition: "color 0.2s ease, background-color 0.2s ease" }}
              aria-label={showCurrentPassword ? "Masquer" : "Afficher"}
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.current && (
            <p className="text-xs text-destructive mt-1">{errors.current.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pwd-next" className={FIELD_LABEL_CLASSES}>
              Nouveau mot de passe <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="pwd-next"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                className="rounded-xl pr-11 transition-all duration-200 focus-visible:ring-[hsl(22_72%_48%/0.5)]"
              style={{ height: "48px", borderRadius: "12px" }}
                {...register("next")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                style={{ transition: "color 0.2s ease, background-color 0.2s ease" }}
                aria-label={showNewPassword ? "Masquer" : "Afficher"}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                className="rounded-xl pr-11 transition-all duration-200 focus-visible:ring-[hsl(22_72%_48%/0.5)]"
              style={{ height: "48px", borderRadius: "12px" }}
                {...register("confirm")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                style={{ transition: "color 0.2s ease, background-color 0.2s ease" }}
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

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="min-h-[44px] rounded-lg"
            style={{
              background: "linear-gradient(135deg, hsl(36 72% 42%), hsl(36 88% 52%))",
              boxShadow: "0 4px 14px hsl(36 88% 52% / 0.30)",
              color: "white",
              border: "none",
            }}
          >
            {changePasswordMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            {changePasswordMutation.isPending ? "Modification…" : "Changer le mot de passe"}
          </Button>
        </div>
      </form>
    </PremiumSection>
  );
}

// ─── Preferences section ──────────────────────────────────────────────────────

function PreferencesSection() {
  const { handleSubmit, control } = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: "fr",
      timezone: "Africa/Libreville",
    },
  });

  function onSubmit(_values: PreferencesFormValues) {
    toast.success("Préférences sauvegardées.");
  }

  return (
    <PremiumSection
      icon={<Settings2 />}
      iconGradient
      title="Préférences"
      description="Langue de l'interface et fuseau horaire par défaut."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASSES}>Langue de l'interface</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="rounded-xl" style={{ height: "48px", borderRadius: "12px" }}>
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
                <SelectTrigger className="rounded-xl" style={{ height: "48px", borderRadius: "12px" }}>
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

        <div className="sm:col-span-2 flex justify-end pt-1">
          <Button
            type="submit"
            className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)] active:scale-[0.97]"
            style={{ transition: "transform 0.15s ease, box-shadow 0.2s ease" }}
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </form>
    </PremiumSection>
  );
}

// ─── Vendeur info banner ──────────────────────────────────────────────────────

function VendeurInfoBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3.5 mb-5"
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
          Votre rôle : Vendeur·se
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Contactez un administrateur pour modifier vos permissions ou accéder aux paramètres avancés.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function useSectionStagger(count: number, initialDelay = 200, step = 100) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => setVisibleCount((prev) => Math.max(prev, i + 1)), initialDelay + i * step)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [count, initialDelay, step]);

  return visibleCount;
}

function sectionAnimStyle(index: number, visibleCount: number): React.CSSProperties {
  const visible = visibleCount > index;
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(12px)",
    transition: "opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
}

export default function ProfilePage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { currentUser } = useAuth();
  const isVendeur = currentUser?.role === "vendeur";
  const visibleCount = useSectionStagger(3);

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
        <div style={sectionAnimStyle(0, visibleCount)}>
          <ProfileSection />
        </div>
        <div style={sectionAnimStyle(1, visibleCount)}>
          <SecuritySection />
        </div>
        <PermissionGate permission="manage_settings">
          <div style={sectionAnimStyle(2, visibleCount)}>
            <PreferencesSection />
          </div>
        </PermissionGate>
      </div>
    </>
  );
}
