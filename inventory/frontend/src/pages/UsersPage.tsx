import { useOutletContext, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TableToolbar } from "@/components/ui/TableToolbar";
import { SortableHeader } from "@/components/ui/SortableHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Shield,
  Users as UsersIcon,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  UserCog,
  Pencil,
  UserX,
  UserCheck,
  ShieldCheck,
  LayoutGrid,
  Crown,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { useTableManager } from "@/hooks/useTableManager";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  userService,
  type UserListItem,
  type UserUpdatePayload,
} from "@/services/userService";
import { activityService, type VendeurActivitySummary } from "@/services/activityService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/roleLabel";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "admin" | "vendeur";
type StatusFilter = "all" | "active" | "inactive";

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; user: UserListItem }
  | { type: "delete"; user: UserListItem }
  | { type: "permissions"; user: UserListItem };

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "vendeur"], { required_error: "Sélectionnez un rôle" }),
  genre: z.enum(["M", "F", "NC"]).optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "vendeur"], { required_error: "Sélectionnez un rôle" }),
  genre: z.enum(["M", "F", "NC"]).optional(),
  phone: z.string().optional(),
  is_active_profile: z.boolean(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_LABEL_CLASSES =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]";

/** A user is considered active only when both the Django User and the profile are active. */
function isUserActive(u: UserListItem): boolean {
  return u.is_active && u.profile.is_active;
}

function getInitialsFromName(name: string, fallback: string): string {
  const parts = name.split(" ").filter(Boolean);
  const fromName = parts
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName;
  return fallback.slice(0, 2).toUpperCase() || "??";
}

// ─── Avatar primitive ─────────────────────────────────────────────────────────

interface UserAvatarProps {
  name: string;
  username: string;
  role?: UserRole;
  size?: "sm" | "md" | "lg";
}

function UserAvatar({ name, username, role = "vendeur", size = "md" }: UserAvatarProps) {
  const initials = getInitialsFromName(name, username);
  const isAdmin = role === "admin";
  const dimensions =
    size === "sm"
      ? "w-9 h-9 text-xs"
      : size === "lg"
      ? "w-12 h-12 text-base"
      : "w-10 h-10 text-sm";

  return (
    <div
      className={[
        "relative flex items-center justify-center shrink-0 font-bold text-white",
        dimensions,
      ].join(" ")}
      style={{
        borderRadius: "12px",
        background: isAdmin
          ? "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))"
          : "linear-gradient(135deg, hsl(210 70% 48%), hsl(220 75% 58%))",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ─── Role pill ────────────────────────────────────────────────────────────────

function RolePill({ role, genre }: { role: UserRole; genre?: 'M' | 'F' | null }) {
  const isAdmin = role === "admin";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
      style={
        isAdmin
          ? {
              background: "linear-gradient(135deg, hsl(22 72% 48% / 0.14), hsl(36 88% 52% / 0.10))",
              color: "hsl(22 60% 35%)",
              border: "1px solid hsl(22 72% 48% / 0.28)",
              transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
            }
          : {
              background: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
              border: "1px solid hsl(var(--border) / 0.5)",
              transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
            }
      }
    >
      {isAdmin
        ? <Crown style={{ width: "12px", height: "12px" }} aria-hidden="true" />
        : <ShoppingBag className="w-3 h-3" aria-hidden="true" />
      }
      {getRoleLabel(role, genre)}
    </span>
  );
}

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{
        background: active ? "hsl(142 72% 38% / 0.1)" : "hsl(var(--muted))",
        color: active ? "hsl(142 72% 38%)" : "hsl(var(--muted-foreground))",
        transition: "background-color 0.3s ease, color 0.3s ease",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: active ? "hsl(142 72% 38%)" : "currentColor",
          boxShadow: active ? "0 0 0 3px hsl(142 72% 38% / 0.2)" : "none",
          transition: "background-color 0.3s ease, box-shadow 0.3s ease",
        }}
      />
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function formatRevenue(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

interface ActivityCellProps {
  summary: VendeurActivitySummary | undefined;
  compact?: boolean;
}

function ActivityCell({ summary, compact = false }: ActivityCellProps) {
  if (!summary || summary.action_count === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Aucune activité
      </span>
    );
  }

  const salesLine = (
    <span className="font-semibold text-xs" style={{ color: "hsl(22 72% 42%)" }}>
      {summary.sales_count} vente{summary.sales_count > 1 ? "s" : ""}
    </span>
  );

  const revenueLine = (
    <span className="text-xs text-muted-foreground">
      {formatRevenue(summary.total_revenue)}
    </span>
  );

  const lastSeenLine = summary.last_action_at ? (
    <span className="text-[11px] text-muted-foreground/70">
      {formatRelativeTime(summary.last_action_at)}
    </span>
  ) : null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
        {salesLine}
        <span className="text-border/80">·</span>
        {revenueLine}
        {lastSeenLine && (
          <>
            <span className="text-border/80">·</span>
            {lastSeenLine}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {salesLine}
        <span className="text-border/80 text-[11px]">·</span>
        {revenueLine}
      </div>
      {lastSeenLine}
    </div>
  );
}

// ─── Premium form input ───────────────────────────────────────────────────────

function FieldWrapper({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={FIELD_LABEL_CLASSES}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Create user form ─────────────────────────────────────────────────────────

interface CreateUserFormProps {
  onSubmit: (values: CreateUserFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CreateUserForm({ onSubmit, onCancel, isSubmitting }: CreateUserFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      role: "vendeur",
      genre: "NC",
      phone: "",
      password: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FieldWrapper label="Prénom" required error={errors.first_name?.message}>
          <Input id="create-first-name" placeholder="Ex : Fatou" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("first_name")} />
        </FieldWrapper>
        <FieldWrapper label="Nom" required error={errors.last_name?.message}>
          <Input id="create-last-name" placeholder="Ex : Mbaye" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("last_name")} />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Nom d'utilisateur" required error={errors.username?.message}>
        <Input id="create-username" placeholder="Ex : fatou.mbaye" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("username")} />
      </FieldWrapper>

      <FieldWrapper label="Email" required error={errors.email?.message}>
        <Input id="create-email" type="email" placeholder="utilisateur@naoservices.ga" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("email")} />
      </FieldWrapper>

      <div className="grid grid-cols-2 gap-3">
        <FieldWrapper label="Rôle" required error={errors.role?.message}>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-11 rounded-xl border-border/80">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5" style={{ color: "hsl(22 72% 48%)" }} />
                      Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="vendeur">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5" style={{ color: "hsl(210 70% 52%)" }} />
                      Vendeur·se
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldWrapper>

        <FieldWrapper label="Civilité">
          <Controller
            control={control}
            name="genre"
            render={({ field }) => (
              <Select value={field.value ?? "NC"} onValueChange={field.onChange}>
                <SelectTrigger className="h-11 rounded-xl border-border/80">
                  <SelectValue placeholder="Non précisé" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NC">Non précisé</SelectItem>
                  <SelectItem value="M">Monsieur</SelectItem>
                  <SelectItem value="F">Madame</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Téléphone">
        <Input id="create-phone" placeholder="+241 07 XX XX XX" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("phone")} />
      </FieldWrapper>

      <FieldWrapper label="Mot de passe temporaire" required error={errors.password?.message}>
        <div className="relative">
          <Input
            id="create-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="h-11 rounded-xl pr-11 border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </FieldWrapper>

      <DialogFooter className="gap-2 sm:gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px] rounded-xl"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-xl text-white border-0"
          style={{
            background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
            boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
          }}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Créer l'utilisateur
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Edit user form ───────────────────────────────────────────────────────────

interface EditUserFormProps {
  user: UserListItem;
  onSubmit: (values: EditUserFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function EditUserForm({ user, onSubmit, onCancel, isSubmitting }: EditUserFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      role: user.profile.role,
      genre: (user.profile.genre ?? "NC") as "M" | "F" | "NC",
      phone: user.profile.phone ?? "",
      is_active_profile: user.profile.is_active,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FieldWrapper label="Prénom" required error={errors.first_name?.message}>
          <Input id="edit-first-name" placeholder="Ex : Fatou" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("first_name")} />
        </FieldWrapper>
        <FieldWrapper label="Nom" required error={errors.last_name?.message}>
          <Input id="edit-last-name" placeholder="Ex : Mbaye" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("last_name")} />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Nom d'utilisateur" required error={errors.username?.message}>
        <Input id="edit-username" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("username")} />
      </FieldWrapper>

      <FieldWrapper label="Email" required error={errors.email?.message}>
        <Input id="edit-email" type="email" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("email")} />
      </FieldWrapper>

      <div className="grid grid-cols-2 gap-3">
        <FieldWrapper label="Rôle" required error={errors.role?.message}>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="h-11 rounded-xl border-border/80">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5" style={{ color: "hsl(22 72% 48%)" }} />
                      Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="vendeur">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5" style={{ color: "hsl(210 70% 52%)" }} />
                      Vendeur·se
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldWrapper>
        <FieldWrapper label="Civilité">
          <Controller
            control={control}
            name="genre"
            render={({ field }) => (
              <Select value={field.value ?? "NC"} onValueChange={field.onChange}>
                <SelectTrigger className="h-11 rounded-xl border-border/80">
                  <SelectValue placeholder="Non précisé" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NC">Non précisé</SelectItem>
                  <SelectItem value="M">Monsieur</SelectItem>
                  <SelectItem value="F">Madame</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Téléphone">
        <Input id="edit-phone" placeholder="+241 07 XX XX XX" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("phone")} />
      </FieldWrapper>

      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <Label className={FIELD_LABEL_CLASSES}>Statut du compte</Label>
          <p className="text-xs text-muted-foreground">
            Activer ou désactiver l'accès de cet utilisateur
          </p>
        </div>
        <Controller
          control={control}
          name="is_active_profile"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label="Statut du compte"
            />
          )}
        />
      </div>

      <DialogFooter className="gap-2 sm:gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px] rounded-xl"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-xl text-white border-0"
          style={{
            background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
            boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
          }}
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer les modifications
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Status filter pills ──────────────────────────────────────────────────────

interface StatusFilterPillsProps {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: { all: number; active: number; inactive: number };
}

function StatusFilterPills({ value, onChange, counts }: StatusFilterPillsProps) {
  const options: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "active", label: "Actifs", count: counts.active },
    { key: "inactive", label: "Inactifs", count: counts.inactive },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filtrer par statut">
      {options.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={
              isActive
                ? {
                    background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                    color: "white",
                    boxShadow: "0 2px 8px hsl(22 72% 48% / 0.35)",
                  }
                : undefined
            }
          >
            {!isActive && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                {opt.label}
                <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold min-w-[18px] bg-background/60">
                  {opt.count}
                </span>
              </span>
            )}
            {isActive && (
              <>
                {opt.label}
                <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold min-w-[18px] bg-white/25">
                  {opt.count}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Permissions modal ────────────────────────────────────────────────────────

const ALL_PERMISSIONS: Permission[] = [
  'manage_users',
  'manage_products',
  'manage_stock',
  'manage_suppliers',
  'manage_clients',
  'view_reports',
  'view_barcodes',
  'view_invoices',
  'make_sales',
  'manage_settings',
];

const PERMISSION_LABELS: Record<Permission, string> = {
  manage_users: 'Gérer les utilisateurs',
  manage_products: 'Gérer les produits',
  manage_stock: 'Gérer le stock',
  manage_suppliers: 'Gérer les fournisseurs',
  manage_clients: 'Gérer les clients',
  view_reports: 'Voir les rapports',
  view_barcodes: 'Voir les codes-barres',
  view_invoices: 'Voir les factures',
  make_sales: 'Faire des ventes (POS)',
  manage_settings: 'Accès aux paramètres',
};

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Gestion',
    permissions: [
      'manage_users',
      'manage_products',
      'manage_stock',
      'manage_suppliers',
      'manage_clients',
    ],
  },
  {
    label: 'Consultation',
    permissions: [
      'view_reports',
      'view_barcodes',
      'view_invoices',
      'make_sales',
      'manage_settings',
    ],
  },
];

// ─── Permission presets ───────────────────────────────────────────────────────

const PERMISSION_PRESETS: {
  label: string;
  permissions: Permission[];
  colorClass: string;
}[] = [
  {
    label: 'Vendeur·se standard',
    permissions: ['make_sales', 'view_invoices', 'manage_clients'],
    colorClass:
      'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40',
  },
  {
    label: 'Vendeur·se étendu·e',
    permissions: [
      'make_sales',
      'view_invoices',
      'manage_clients',
      'manage_products',
      'manage_stock',
      'view_barcodes',
    ],
    colorClass:
      'border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40',
  },
  {
    label: 'Accès complet',
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'manage_users'),
    colorClass:
      'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
  },
  {
    label: 'Aucun accès',
    permissions: [],
    colorClass:
      'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40',
  },
];

// ─── Permissions modal content ────────────────────────────────────────────────

interface PermissionsModalProps {
  user: UserListItem;
  onSave: (permissions: Permission[]) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function PermissionsModal({ user, onSave, onCancel, isSaving }: PermissionsModalProps) {
  const initial = (user.permissions ?? []) as Permission[];
  const [selected, setSelected] = useState<Set<Permission>>(new Set(initial));

  function toggle(p: Permission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  function applyPreset(permissions: Permission[]) {
    setSelected(new Set(permissions));
  }

  return (
    <div className="space-y-5">
      {/* Présets rapides */}
      <div>
        <p className={[FIELD_LABEL_CLASSES, "mb-2.5"].join(" ")}>Application rapide</p>
        <div className="flex flex-wrap gap-1.5">
          {PERMISSION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.permissions)}
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                preset.colorClass,
              ].join(" ")}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50" />

      {/* Checkboxes par groupe */}
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className={[FIELD_LABEL_CLASSES, "mb-2"].join(" ")}>{group.label}</p>
          <div className="space-y-2">
            {group.permissions.map((p) => {
              const checked = selected.has(p);
              return (
                <label
                  key={p}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p)}
                    className="h-4 w-4 rounded border-input cursor-pointer shrink-0"
                    style={{ accentColor: "hsl(22 72% 48%)" }}
                  />
                  <span className="text-sm text-foreground">{PERMISSION_LABELS[p]}</span>
                  {checked && (
                    <ShieldCheck
                      className="w-3.5 h-3.5 ml-auto shrink-0"
                      style={{ color: "hsl(152 38% 38%)" }}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Lien vers la vue matrice */}
      <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
        <Link
          to="/admin/permissions"
          className="inline-flex items-center gap-1.5 text-sm hover:underline transition-colors"
          style={{ color: "hsl(22 72% 48%)" }}
          onClick={onCancel}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Gérer depuis la vue matrice</span>
        </Link>
      </div>

      <DialogFooter className="gap-2 sm:gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="min-h-[44px] rounded-xl"
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={isSaving}
          className="min-h-[44px] rounded-xl text-white border-0"
          style={{
            background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
            boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
          }}
          onClick={() => onSave(Array.from(selected))}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const ROLE_FILTER_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "vendeur", label: "Vendeur·se" },
];

export default function UsersPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { currentUser } = useAuth();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getAll(),
  });

  const { data: activityData } = useQuery({
    queryKey: ["vendeur-summary", "week"],
    queryFn: () => activityService.getVendeurSummary("week"),
    staleTime: 5 * 60 * 1000,
  });

  const activityMap = new Map<number, VendeurActivitySummary>(
    (activityData ?? []).map((s) => [s.user_id, s])
  );

  const users: UserListItem[] = data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: (values: CreateUserFormValues) =>
      userService.create({
        username: values.username,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        password: values.password,
        role: values.role,
        genre: (!values.genre || values.genre === "NC") ? null : values.genre,
        phone: values.phone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModal({ type: "none" });
      toast.success("Utilisateur créé avec succès.");
    },
    onError: () => {
      toast.error("Erreur lors de la création. Vérifiez les informations saisies.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserUpdatePayload> }) =>
      userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModal({ type: "none" });
      toast.success("Utilisateur modifié avec succès.");
    },
    onError: () => {
      toast.error("Erreur lors de la modification. Vérifiez les informations saisies.");
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => userService.activate(id),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (updatedUser.is_active) {
        toast.success("Compte utilisateur réactivé avec succès");
      } else {
        toast.success("Compte utilisateur désactivé");
      }
    },
    onError: () => {
      toast.error("Impossible de changer le statut du compte.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModal({ type: "none" });
      toast.success("Compte utilisateur désactivé");
    },
    onError: () => {
      toast.error("Erreur lors de la désactivation.");
    },
  });

  const permissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: Permission[] }) =>
      userService.setPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModal({ type: "none" });
      toast.success("Permissions mises à jour.");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des permissions.");
    },
  });

  // ── Filtering ─────────────────────────────────────────────────────────────

  const totalUsers = users.length;
  const activeCount = users.filter(isUserActive).length;
  const inactiveCount = totalUsers - activeCount;
  const adminCount = users.filter((u) => u.profile.role === "admin").length;
  const vendeurCount = totalUsers - adminCount;

  const filtered = users.filter((u) => {
    if (roleFilter && u.profile.role !== (roleFilter as UserRole)) return false;
    if (statusFilter === "active" && !isUserActive(u)) return false;
    if (statusFilter === "inactive" && isUserActive(u)) return false;
    return true;
  });

  const {
    paginated,
    sort,
    toggleSort,
    selectedIds,
    isSelected,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  } = useTableManager(filtered as unknown as Record<string, unknown>[], {
    searchKeys: ["full_name", "email", "username"] as never[],
  });

  const typedPaginated = paginated as unknown as UserListItem[];
  const allPageIds = typedPaginated.map((u) => u.id);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCreate(values: CreateUserFormValues) {
    createMutation.mutate(values);
  }

  function handleEdit(values: EditUserFormValues) {
    if (modal.type !== "edit") return;
    updateMutation.mutate({
      id: modal.user.id,
      data: {
        first_name: values.first_name,
        last_name: values.last_name,
        username: values.username,
        email: values.email,
        role: values.role,
        genre: (!values.genre || values.genre === "NC") ? null : values.genre,
        phone: values.phone,
        profile_is_active: values.is_active_profile,
      },
    });
  }

  function handleRevoke() {
    if (modal.type !== "delete") return;
    deleteMutation.mutate(modal.user.id);
  }

  function toggleActivation(user: UserListItem) {
    activateMutation.mutate(user.id);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!can('manage_users')) {
    return (
      <AccessDenied message="Vous n'avez pas la permission de gérer les utilisateurs." />
    );
  }

  return (
    <>
      <Topbar
        title="Utilisateurs"
        subtitle="Gestion des comptes et des rôles"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Premium Page Header ── */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-1 h-7 rounded-full"
                  style={{ background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))" }}
                />
                <h2
                  className="text-2xl font-extrabold text-foreground"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Gestion des utilisateurs
                </h2>
              </div>
              <div className="flex items-center gap-3 ml-3.5">
                <p className="text-sm text-muted-foreground">
                  {totalUsers} utilisateur{totalUsers > 1 ? "s" : ""} ·{" "}
                  <span style={{ color: "hsl(152 38% 38%)" }} className="font-medium">
                    {activeCount} actif{activeCount > 1 ? "s" : ""}
                  </span>
                </p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: "hsl(22 72% 48% / 0.1)", color: "hsl(22 72% 48%)" }}>
                  <Crown className="w-3 h-3" />
                  {adminCount} admin{adminCount > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: "hsl(210 70% 52% / 0.1)", color: "hsl(210 70% 52%)" }}>
                  <ShoppingBag className="w-3 h-3" />
                  {vendeurCount} vendeur{vendeurCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/admin/permissions"
                className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-xl transition-all hover:opacity-90"
                style={{
                  border: "1px solid hsl(22 72% 48% / 0.5)",
                  color: "hsl(22 60% 35%)",
                  background: "hsl(22 72% 48% / 0.06)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(22 72% 48% / 0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(22 72% 48% / 0.06)"; }}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Matrice permissions
              </Link>
              {can('manage_users') && (
                <button
                  onClick={() => setModal({ type: "create" })}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                    boxShadow: "0 4px 14px hsl(22 72% 48% / 0.4), 0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nouvel utilisateur
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filtre statut */}
        <div className="mb-3">
          <StatusFilterPills
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              clearSelection();
            }}
            counts={{ all: totalUsers, active: activeCount, inactive: inactiveCount }}
          />
        </div>

        {/* Barre d'outils tableau */}
        <TableToolbar
          showCheckbox
          isAllSelected={isAllSelected(allPageIds)}
          isIndeterminate={isIndeterminate(allPageIds)}
          onToggleAll={() => toggleAll(allPageIds)}
          selectedCount={selectedIds.size}
          filterValue={roleFilter}
          filterOptions={ROLE_FILTER_OPTIONS}
          filterPlaceholder="Tous les rôles"
          onFilterChange={(val) => {
            setRoleFilter(val);
            clearSelection();
          }}
        />

        {/* Loading / error states */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Chargement des utilisateurs…</span>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex items-center justify-center py-16 text-destructive text-sm">
            Impossible de charger les utilisateurs. Vérifiez la connexion au serveur.
          </div>
        )}

        {/* Desktop : table */}
        {!isLoading && !isError && (
          <div className="hidden md:block bg-card rounded-2xl border border-border/70 overflow-hidden shadow-[0_1px_2px_rgba(120,60,20,0.04),0_8px_24px_-12px_rgba(120,60,20,0.10)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)", background: "hsl(30 15% 95%)" }}>
                    <th className="w-10 px-4 py-3">
                      <span className="sr-only">Sélection</span>
                    </th>
                    <SortableHeader
                      label="Utilisateur"
                      sortKey="full_name"
                      currentSort={sort}
                      onSort={toggleSort}
                    />
                    <th className="text-left px-4 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                    <SortableHeader
                      label="Rôle"
                      sortKey="profile.role"
                      currentSort={sort}
                      onSort={toggleSort}
                    />
                    <th className="text-left px-4 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>Permissions</th>
                    <th className="text-left px-4 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut</th>
                    <th className="text-left px-4 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>Activité (7j)</th>
                    <th className="w-36 px-4 py-3" style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typedPaginated.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                            <UserCog className="w-5 h-5" />
                          </span>
                          <p className="text-sm">Aucun utilisateur trouvé.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {typedPaginated.map((user, index) => {
                    const displayName = user.full_name || user.username;
                    const userRole = user.profile.role as UserRole;
                    const isAdmin = userRole === "admin";
                    const active = isUserActive(user);
                    return (
                      <tr
                        key={user.id}
                        className="group border-b border-border/40 last:border-0 transition-colors"
                        style={{
                          ...(isSelected(user.id) ? { background: "hsl(22 72% 48% / 0.04)" } : {}),
                          animationDelay: `${index * 50}ms`,
                          animation: "slideInUp 0.3s ease forwards",
                          opacity: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected(user.id)) {
                            e.currentTarget.style.background = "hsl(22 72% 48% / 0.025)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected(user.id)) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                      >
                        {/* Checkbox */}
                        <td className="w-10 px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected(user.id)}
                            onChange={() => toggleRow(user.id)}
                            className="h-4 w-4 rounded border-input cursor-pointer"
                            style={{ accentColor: "hsl(22 72% 48%)" }}
                            aria-label={`Sélectionner ${displayName}`}
                          />
                        </td>

                        {/* Avatar + Nom */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <UserAvatar name={displayName} username={user.username} role={userRole} size="sm" />
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                                style={{ background: active ? "hsl(152 38% 38%)" : "hsl(var(--muted-foreground))" }}
                              />
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/users/${user.id}`}
                                className="font-semibold text-sm text-foreground truncate block hover:underline transition-colors"
                                style={{ color: undefined }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(22 72% 48%)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = ""; }}
                              >
                                {displayName}
                              </Link>
                              <span className="font-mono text-xs text-muted-foreground">@{user.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 text-sm text-muted-foreground">{user.email}</td>

                        {/* Rôle */}
                        <td className="px-4 py-3.5">
                          <RolePill role={userRole} genre={user.profile.genre} />
                        </td>

                        {/* Permissions */}
                        <td className="px-4 py-3.5">
                          {isAdmin ? (
                            <span className="text-xs font-semibold" style={{ color: "hsl(152 38% 38%)" }}>
                              Accès complet
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {(user.permissions?.length ?? 0)} permission{(user.permissions?.length ?? 0) > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3.5">
                          <StatusDot active={active} />
                        </td>

                        {/* Activité 7j */}
                        <td className="px-4 py-3.5">
                          <ActivityCell summary={activityMap.get(user.id)} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          {can('manage_users') && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <Link
                                to={`/users/${user.id}`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                title="Voir le détail"
                                aria-label={`Voir le détail de ${displayName}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                title="Modifier"
                                aria-label={`Modifier ${displayName}`}
                                onClick={() => setModal({ type: "edit", user })}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {user.profile.role === "vendeur" && (
                                <button
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2"
                                  style={{ color: "hsl(22 72% 48% / 0.7)" }}
                                  title="Gérer les permissions"
                                  aria-label={`Gérer les permissions de ${displayName}`}
                                  onClick={() => setModal({ type: "permissions", user })}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = "hsl(22 72% 48%)";
                                    e.currentTarget.style.background = "hsl(22 72% 48% / 0.08)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "hsl(22 72% 48% / 0.7)";
                                    e.currentTarget.style.background = "transparent";
                                  }}
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                className={[
                                  "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2",
                                  user.is_active
                                    ? "text-destructive/70 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
                                    : "focus-visible:ring-emerald-400/40",
                                ].join(" ")}
                                style={!user.is_active ? { color: "hsl(152 38% 38% / 0.7)" } : undefined}
                                title={user.is_active ? "Désactiver" : "Réactiver"}
                                aria-label={user.is_active ? `Désactiver ${displayName}` : `Réactiver ${displayName}`}
                                onClick={() => toggleActivation(user)}
                                disabled={activateMutation.isPending}
                                onMouseEnter={(e) => {
                                  if (!user.is_active) {
                                    e.currentTarget.style.color = "hsl(152 38% 38%)";
                                    e.currentTarget.style.background = "hsl(152 38% 38% / 0.08)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!user.is_active) {
                                    e.currentTarget.style.color = "hsl(152 38% 38% / 0.7)";
                                    e.currentTarget.style.background = "transparent";
                                  }
                                }}
                              >
                                {user.is_active ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {String(user.id) !== currentUser?.id && (
                                <button
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                  title="Désactiver l'utilisateur"
                                  aria-label={`Désactiver ${displayName}`}
                                  onClick={() => setModal({ type: "delete", user })}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile : card list */}
        {!isLoading && !isError && (
          <div className="md:hidden space-y-3">
            {typedPaginated.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <UserCog className="w-5 h-5" />
                </span>
                <p className="text-sm">Aucun utilisateur trouvé.</p>
              </div>
            )}
            {typedPaginated.map((user, idx) => {
              const displayName = user.full_name || user.username;
              const userRole = user.profile.role as UserRole;
              const active = isUserActive(user);
              return (
                <div
                  key={user.id}
                  className={[
                    "bg-card border rounded-2xl p-4 flex items-start gap-3 transition-all duration-150",
                    "animate-[fadeScale_0.2s_ease-out_both]",
                    isSelected(user.id)
                      ? "border-[hsl(22_72%_48%/0.4)] shadow-[0_6px_20px_-12px_hsl(22_72%_48%/0.35)]"
                      : "border-border/70 shadow-[0_1px_2px_rgba(120,60,20,0.04)]",
                  ].join(" ")}
                  style={{
                    animationDelay: `${idx * 40}ms`,
                    background: isSelected(user.id) ? "hsl(22 72% 48% / 0.025)" : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(user.id)}
                    onChange={() => toggleRow(user.id)}
                    className="h-4 w-4 mt-2 rounded border-input cursor-pointer shrink-0"
                    style={{ accentColor: "hsl(22 72% 48%)" }}
                    aria-label={`Sélectionner ${displayName}`}
                  />
                  <div className="relative">
                    <UserAvatar name={displayName} username={user.username} role={userRole} size="lg" />
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                      style={{ background: active ? "hsl(152 38% 38%)" : "hsl(var(--muted-foreground))" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/users/${user.id}`}
                      className="font-semibold text-sm text-foreground truncate block hover:underline transition-colors"
                    >
                      {displayName}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                      @{user.username}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <RolePill role={userRole} />
                      <StatusDot active={active} />
                    </div>
                    <ActivityCell summary={activityMap.get(user.id)} compact />
                  </div>
                  {can('manage_users') && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Link
                        to={`/users/${user.id}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        title="Voir le détail"
                        aria-label={`Voir le détail de ${displayName}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        title="Modifier"
                        aria-label={`Modifier ${displayName}`}
                        onClick={() => setModal({ type: "edit", user })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.profile.role === "vendeur" && (
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
                          style={{ color: "hsl(22 72% 48% / 0.7)" }}
                          title="Gérer les permissions"
                          aria-label={`Gérer les permissions de ${displayName}`}
                          onClick={() => setModal({ type: "permissions", user })}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className={[
                          "inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors",
                          user.is_active
                            ? "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            : "",
                        ].join(" ")}
                        style={!user.is_active ? { color: "hsl(152 38% 38% / 0.7)" } : undefined}
                        title={user.is_active ? "Désactiver" : "Réactiver"}
                        aria-label={user.is_active ? `Désactiver ${displayName}` : `Réactiver ${displayName}`}
                        onClick={() => toggleActivation(user)}
                        disabled={activateMutation.isPending}
                      >
                        {user.is_active ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                      {String(user.id) !== currentUser?.id && (
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Désactiver l'utilisateur"
                          aria-label={`Désactiver ${displayName}`}
                          onClick={() => setModal({ type: "delete", user })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal : Nouvel utilisateur ── */}
      <Dialog
        open={modal.type === "create"}
        onOpenChange={(open) => {
          if (!createMutation.isPending && !open) setModal({ type: "none" });
        }}
      >
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[page-exit_0.15s_ease-in_both] rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "hsl(22 72% 48% / 0.1)" }}
              >
                <UsersIcon className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
              </span>
              <div>
                <DialogTitle className="text-base font-bold">Nouvel utilisateur</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Créer un compte avec rôle et accès
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-2">
            <CreateUserForm
              onSubmit={handleCreate}
              onCancel={() => setModal({ type: "none" })}
              isSubmitting={createMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Modifier utilisateur ── */}
      <Dialog
        open={modal.type === "edit"}
        onOpenChange={(open) => {
          if (!updateMutation.isPending && !open) setModal({ type: "none" });
        }}
      >
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[page-exit_0.15s_ease-in_both] rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "hsl(22 72% 48% / 0.1)" }}
              >
                <Pencil className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
              </span>
              <div>
                <DialogTitle className="text-base font-bold">Modifier l'utilisateur</DialogTitle>
                {modal.type === "edit" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modal.user.full_name || modal.user.username}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="pt-2">
            {modal.type === "edit" && (
              <EditUserForm
                user={modal.user}
                onSubmit={handleEdit}
                onCancel={() => setModal({ type: "none" })}
                isSubmitting={updateMutation.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Gérer les permissions ── */}
      <Dialog
        open={modal.type === "permissions"}
        onOpenChange={(open) => {
          if (!permissionsMutation.isPending && !open) setModal({ type: "none" });
        }}
      >
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[page-exit_0.15s_ease-in_both] rounded-2xl">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "hsl(22 72% 48% / 0.1)" }}
              >
                <ShieldCheck className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
              </span>
              <div>
                <DialogTitle className="text-base font-bold">
                  Permissions de{" "}
                  {modal.type === "permissions"
                    ? modal.user.full_name || modal.user.username
                    : ""}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cochez les accès à accorder à cet utilisateur
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-2 max-h-[70vh] overflow-y-auto pr-1">
            {modal.type === "permissions" && (
              <PermissionsModal
                user={modal.user}
                onSave={(permissions) =>
                  permissionsMutation.mutate({
                    id: modal.user.id,
                    permissions,
                  })
                }
                onCancel={() => setModal({ type: "none" })}
                isSaving={permissionsMutation.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog : Révoquer accès ── */}
      <AlertDialog
        open={modal.type === "delete"}
        onOpenChange={(open) => {
          if (!open) setModal({ type: "none" });
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>
                {modal.type === "delete"
                  ? modal.user.full_name || modal.user.username
                  : ""}
              </strong>{" "}
              sera désactivé (soft delete). Il ne pourra plus se connecter mais ses données sont conservées. Vous pourrez le réactiver à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending} className="rounded-xl">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={handleRevoke}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
