import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import { AccessDenied } from "@/components/ui/AccessDenied";

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
  phone: z.string().optional(),
  is_active_profile: z.boolean(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIELD_LABEL_CLASSES =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]";

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
  size?: "sm" | "md" | "lg";
}

function UserAvatar({ name, username, size = "md" }: UserAvatarProps) {
  const initials = getInitialsFromName(name, username);
  const dimensions =
    size === "sm"
      ? "w-9 h-9 text-xs"
      : size === "lg"
      ? "w-12 h-12 text-base"
      : "w-11 h-11 text-sm";
  return (
    <div
      className={[
        "relative rounded-full flex items-center justify-center shrink-0 font-semibold text-primary-foreground ring-1 ring-primary/15 shadow-[0_4px_14px_-8px_hsl(var(--primary)/0.5)]",
        dimensions,
      ].join(" ")}
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.78) 100%)",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ─── Role pill ────────────────────────────────────────────────────────────────

function RolePill({ role }: { role: UserRole }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1",
        isAdmin
          ? "bg-primary/10 text-primary ring-primary/25"
          : "bg-accent/15 text-accent ring-accent/25",
      ].join(" ")}
    >
      <Shield className="w-3 h-3" aria-hidden="true" />
      {isAdmin ? "Admin" : "Vendeur"}
    </span>
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
      phone: "",
      password: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="create-first-name" className={FIELD_LABEL_CLASSES}>
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-first-name"
            placeholder="Ex : Fatou"
            className="h-11 rounded-lg"
            {...register("first_name")}
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="create-last-name" className={FIELD_LABEL_CLASSES}>
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-last-name"
            placeholder="Ex : Mbaye"
            className="h-11 rounded-lg"
            {...register("last_name")}
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-username" className={FIELD_LABEL_CLASSES}>
          Nom d'utilisateur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="create-username"
          placeholder="Ex : fatou.mbaye"
          className="h-11 rounded-lg"
          {...register("username")}
        />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-email" className={FIELD_LABEL_CLASSES}>
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="create-email"
          type="email"
          placeholder="utilisateur@naoservices.ga"
          className="h-11 rounded-lg"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASSES}>
            Rôle <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="create-phone" className={FIELD_LABEL_CLASSES}>
            Téléphone
          </Label>
          <Input
            id="create-phone"
            placeholder="+241 07 XX XX XX"
            className="h-11 rounded-lg"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-password" className={FIELD_LABEL_CLASSES}>
          Mot de passe temporaire <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="create-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="h-11 rounded-lg pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px] rounded-lg"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)]"
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
      phone: user.profile.phone ?? "",
      is_active_profile: user.is_active,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-first-name" className={FIELD_LABEL_CLASSES}>
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-first-name"
            placeholder="Ex : Fatou"
            className="h-11 rounded-lg"
            {...register("first_name")}
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-last-name" className={FIELD_LABEL_CLASSES}>
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-last-name"
            placeholder="Ex : Mbaye"
            className="h-11 rounded-lg"
            {...register("last_name")}
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-username" className={FIELD_LABEL_CLASSES}>
          Nom d'utilisateur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-username"
          placeholder="Ex : fatou.mbaye"
          className="h-11 rounded-lg"
          {...register("username")}
        />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-email" className={FIELD_LABEL_CLASSES}>
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-email"
          type="email"
          placeholder="utilisateur@naoservices.ga"
          className="h-11 rounded-lg"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASSES}>
            Rôle <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && (
            <p className="text-xs text-destructive">{errors.role.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-phone" className={FIELD_LABEL_CLASSES}>
            Téléphone
          </Label>
          <Input
            id="edit-phone"
            placeholder="+241 07 XX XX XX"
            className="h-11 rounded-lg"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
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

      <DialogFooter className="gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="min-h-[44px] rounded-lg"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)]"
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
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_2px_8px_-4px_hsl(var(--primary)/0.6)]"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {opt.label}
            <span
              className={[
                "inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px] font-bold min-w-[18px]",
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/60 text-muted-foreground",
              ].join(" ")}
            >
              {opt.count}
            </span>
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
  view_reports: 'Consulter les rapports',
  view_barcodes: 'Consulter les codes-barres',
  view_invoices: 'Consulter les factures',
  make_sales: 'Effectuer des ventes',
  manage_settings: 'Gérer les paramètres',
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

  const displayName = user.full_name || user.username;

  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <p className={[FIELD_LABEL_CLASSES, "mb-2"].join(" ")}>{group.label}</p>
          <div className="space-y-2">
            {group.permissions.map((p) => {
              const checked = selected.has(p);
              return (
                <label
                  key={p}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p)}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-foreground">{PERMISSION_LABELS[p]}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <DialogFooter className="gap-2 sm:gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="min-h-[44px] rounded-lg"
        >
          Annuler
        </Button>
        <Button
          type="button"
          disabled={isSaving}
          className="min-h-[44px] rounded-lg shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)]"
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
  { value: "vendeur", label: "Vendeur" },
];

export default function UsersPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getAll(),
  });

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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      const user = users.find((u) => u.id === id);
      if (user?.is_active) {
        toast.success("Compte désactivé.");
      } else {
        toast.success("Compte réactivé.");
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
      toast.success("Accès révoqué.");
    },
    onError: () => {
      toast.error("Erreur lors de la révocation.");
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
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = totalUsers - activeCount;
  const adminCount = users.filter((u) => u.profile.role === "admin").length;
  const vendeurCount = totalUsers - adminCount;

  const filtered = users.filter((u) => {
    if (roleFilter && u.profile.role !== (roleFilter as UserRole)) return false;
    if (statusFilter === "active" && !u.is_active) return false;
    if (statusFilter === "inactive" && u.is_active) return false;
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
        phone: values.phone,
        is_active_profile: values.is_active_profile,
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
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <UsersIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
                  Équipe
                </h2>
                <span
                  className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold ring-1 ring-primary/20"
                  aria-label={`${totalUsers} utilisateurs au total`}
                >
                  {totalUsers} {totalUsers > 1 ? "membres" : "membre"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary ring-1 ring-primary/25">
                  <Shield className="w-3 h-3" />
                  {adminCount} admin{adminCount > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-accent/15 text-accent ring-1 ring-accent/25">
                  <UsersIcon className="w-3 h-3" />
                  {vendeurCount} vendeur{vendeurCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {can('manage_users') && (
            <Button
              onClick={() => setModal({ type: "create" })}
              className="shrink-0 min-h-[44px] rounded-lg text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)] hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.7)] transition-shadow"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.82) 100%)",
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel utilisateur
            </Button>
          )}
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
          <div className="hidden md:block bg-card rounded-xl border border-border/70 overflow-hidden shadow-[0_1px_2px_rgba(120,60,20,0.04),0_8px_24px_-12px_rgba(120,60,20,0.10)]">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10 px-4">
                      <span className="sr-only">Sélection</span>
                    </th>
                    <SortableHeader
                      label="Utilisateur"
                      sortKey="full_name"
                      currentSort={sort}
                      onSort={toggleSort}
                    />
                    <th>Email</th>
                    <SortableHeader
                      label="Rôle"
                      sortKey="profile.role"
                      currentSort={sort}
                      onSort={toggleSort}
                    />
                    <th>Statut</th>
                    <th className="w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typedPaginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                            <UserCog className="w-5 h-5" />
                          </span>
                          <p className="text-sm">Aucun utilisateur trouvé.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {typedPaginated.map((user) => {
                    const displayName = user.full_name || user.username;
                    return (
                      <tr
                        key={user.id}
                        className={isSelected(user.id) ? "bg-primary/5" : undefined}
                      >
                        <td className="w-10">
                          <input
                            type="checkbox"
                            checked={isSelected(user.id)}
                            onChange={() => toggleRow(user.id)}
                            className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                            aria-label={`Sélectionner ${displayName}`}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={displayName}
                              username={user.username}
                              size="md"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold block text-foreground truncate">
                                {displayName}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                @{user.username}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted-foreground">{user.email}</td>
                        <td>
                          <RolePill role={user.profile.role as UserRole} />
                        </td>
                        <td>
                          <StatusBadge
                            label={user.is_active ? "Actif" : "Inactif"}
                            variant={user.is_active ? "success" : "default"}
                          />
                        </td>
                        <td>
                          {can('manage_users') && (
                            <div className="flex items-center gap-0.5">
                              <button
                                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                title="Modifier"
                                aria-label={`Modifier ${displayName}`}
                                onClick={() => setModal({ type: "edit", user })}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {user.profile.role === "vendeur" && (
                                <button
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-md text-indigo-500/70 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                                  title="Gérer les permissions"
                                  aria-label={`Gérer les permissions de ${displayName}`}
                                  onClick={() => setModal({ type: "permissions", user })}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                className={[
                                  "inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2",
                                  user.is_active
                                    ? "text-destructive/70 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
                                    : "text-[hsl(var(--success,142_76%_36%))]/70 hover:text-[hsl(var(--success,142_76%_36%))] hover:bg-[hsl(var(--success,142_76%_36%))]/10 focus-visible:ring-[hsl(var(--success,142_76%_36%))]/40",
                                ].join(" ")}
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
                              <button
                                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                title="Révoquer l'accès"
                                aria-label={`Révoquer l'accès de ${displayName}`}
                                onClick={() => setModal({ type: "delete", user })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

        {/* Mobile : card list — md:hidden */}
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
              return (
                <div
                  key={user.id}
                  className={[
                    "bg-card border rounded-xl p-4 flex items-start gap-3 transition-all duration-150 shadow-[0_1px_2px_rgba(120,60,20,0.04)]",
                    "animate-[fadeScale_0.2s_ease-out_both]",
                    isSelected(user.id)
                      ? "border-primary/60 bg-primary/[0.04] shadow-[0_6px_20px_-12px_hsl(var(--primary)/0.45)]"
                      : "border-border/70",
                  ].join(" ")}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected(user.id)}
                    onChange={() => toggleRow(user.id)}
                    className="h-4 w-4 mt-2 rounded border-input accent-primary cursor-pointer shrink-0"
                    aria-label={`Sélectionner ${displayName}`}
                  />
                  <UserAvatar name={displayName} username={user.username} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {displayName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                      @{user.username}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <RolePill role={user.profile.role as UserRole} />
                      <StatusBadge
                        label={user.is_active ? "Actif" : "Inactif"}
                        variant={user.is_active ? "success" : "default"}
                      />
                    </div>
                  </div>
                  {can('manage_users') && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Modifier"
                        aria-label={`Modifier ${displayName}`}
                        onClick={() => setModal({ type: "edit", user })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.profile.role === "vendeur" && (
                        <button
                          className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-indigo-500/70 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                          title="Gérer les permissions"
                          aria-label={`Gérer les permissions de ${displayName}`}
                          onClick={() => setModal({ type: "permissions", user })}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className={[
                          "inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2",
                          user.is_active
                            ? "text-destructive/70 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
                            : "text-success/70 hover:text-success hover:bg-success/10 focus-visible:ring-success/40",
                        ].join(" ")}
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
                      <button
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                        title="Révoquer l'accès"
                        aria-label={`Révoquer l'accès de ${displayName}`}
                        onClick={() => setModal({ type: "delete", user })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[page-exit_0.15s_ease-in_both]">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                <UsersIcon className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">Nouvel utilisateur</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Créer un compte avec rôle et accès
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-1">
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
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[page-exit_0.15s_ease-in_both]">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                <Pencil className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">Modifier l'utilisateur</DialogTitle>
                {modal.type === "edit" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modal.user.full_name || modal.user.username}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="pt-1">
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
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] data-[state=closed]:animate-[page-exit_0.15s_ease-in_both]">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">
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
          <div className="pt-1 max-h-[70vh] overflow-y-auto pr-1">
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l'accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              Révoquer l'accès de{" "}
              <strong>
                {modal.type === "delete"
                  ? modal.user.full_name || modal.user.username
                  : ""}
              </strong>{" "}
              supprimera définitivement son compte. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Révoquer l'accès
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
