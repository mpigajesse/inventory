import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Shield,
  ShoppingBag,
  TrendingUp,
  Users,
  Phone,
  Mail,
  AtSign,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldOff,
  Pencil,
  UserX,
  UserCheck,
  Loader2,
  Activity,
  Package,
  ShoppingCart,
  LogIn,
  Settings,
  Tag,
  ExternalLink,
} from "lucide-react";
import {
  userService,
  type UserUpdatePayload,
} from "@/services/userService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import type { Permission } from "@/hooks/usePermissions";
import { Link } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_LABEL_CLASSES =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]";

const ALL_PERMISSIONS: Permission[] = [
  "manage_users",
  "manage_products",
  "manage_stock",
  "manage_suppliers",
  "manage_clients",
  "view_reports",
  "view_barcodes",
  "view_invoices",
  "make_sales",
  "manage_settings",
];

const PERMISSION_LABELS: Record<Permission, string> = {
  manage_users: "Gérer les utilisateurs",
  manage_products: "Gérer les produits",
  manage_stock: "Gérer le stock",
  manage_suppliers: "Gérer les fournisseurs",
  manage_clients: "Gérer les clients",
  view_reports: "Voir les rapports",
  view_barcodes: "Voir les codes-barres",
  view_invoices: "Voir les factures",
  make_sales: "Faire des ventes (POS)",
  manage_settings: "Accès aux paramètres",
};

const PERMISSION_ICONS: Record<Permission, React.ElementType> = {
  manage_users: Users,
  manage_products: Package,
  manage_stock: Package,
  manage_suppliers: ShoppingBag,
  manage_clients: Users,
  view_reports: TrendingUp,
  view_barcodes: Tag,
  view_invoices: ShoppingCart,
  make_sales: ShoppingCart,
  manage_settings: Settings,
};

// ─── Edit schema ──────────────────────────────────────────────────────────────

const editUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "vendeur"], { required_error: "Sélectionnez un rôle" }),
  phone: z.string().optional(),
  is_active_profile: z.boolean(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateFr(isoDate: string | null | undefined): string {
  if (!isoDate) return "Jamais connecté";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatRevenue(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)}h`;
  return `il y a ${Math.floor(diff / 86_400_000)} jour(s)`;
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

function resolveActivityIcon(action: string, targetModel: string): React.ElementType {
  const model = (targetModel ?? "").toLowerCase();
  const act = (action ?? "").toLowerCase();
  if (model === "sale" || model === "saleitem") return ShoppingCart;
  if (model === "product") return Package;
  if (model === "stock" || model === "stockmovement") return Package;
  if (act === "login" || act === "logout") return LogIn;
  return Activity;
}

function resolveActivityColor(action: string, targetModel: string): string {
  const model = (targetModel ?? "").toLowerCase();
  const act = (action ?? "").toLowerCase();
  if (model === "sale" || model === "saleitem") return "bg-success/10 text-success";
  if (model === "product") return "bg-primary/10 text-primary";
  if (model === "stock" || model === "stockmovement")
    return "bg-amber-500/10 text-amber-600";
  if (act === "login" || act === "logout") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface UserAvatarLargeProps {
  name: string;
  username: string;
}

function UserAvatarLarge({ name, username }: UserAvatarLargeProps) {
  const initials = getInitialsFromName(name, username);
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl text-primary-foreground ring-1 ring-primary/15 shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)]"
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

function RolePill({ role }: { role: "admin" | "vendeur" }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1",
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

// ─── Info row ─────────────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={FIELD_LABEL_CLASSES}>{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function SectionCard({ title, children, action }: SectionCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border/70 overflow-hidden shadow-[0_1px_2px_rgba(120,60,20,0.04),0_8px_24px_-12px_rgba(120,60,20,0.08)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Edit modal form ──────────────────────────────────────────────────────────

interface EditUserFormProps {
  defaultValues: EditUserFormValues;
  onSubmit: (values: EditUserFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function EditUserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: EditUserFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="detail-first-name" className={FIELD_LABEL_CLASSES}>
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="detail-first-name"
            className="h-11 rounded-lg"
            {...register("first_name")}
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="detail-last-name" className={FIELD_LABEL_CLASSES}>
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="detail-last-name"
            className="h-11 rounded-lg"
            {...register("last_name")}
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-username" className={FIELD_LABEL_CLASSES}>
          Nom d'utilisateur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="detail-username"
          className="h-11 rounded-lg"
          {...register("username")}
        />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-email" className={FIELD_LABEL_CLASSES}>
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="detail-email"
          type="email"
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
                  <SelectValue placeholder="Rôle" />
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
          <Label htmlFor="detail-phone" className={FIELD_LABEL_CLASSES}>
            Téléphone
          </Label>
          <Input
            id="detail-phone"
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
            Activer ou désactiver l'accès
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
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);

  // ── All hooks must be declared before any guard ───────────────────────────

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user", id],
    queryFn: () => userService.getById(Number(id)),
    enabled: !!id,
  });

  const { data: activityLogs, isLoading: activityLoading } = useQuery({
    queryKey: ["user-activity", id],
    queryFn: () => userService.getActivity(Number(id)),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserUpdatePayload>) =>
      userService.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditOpen(false);
      toast.success("Utilisateur modifié avec succès.");
    },
    onError: () => {
      toast.error("Erreur lors de la modification.");
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => userService.activate(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        user?.is_active ? "Compte désactivé." : "Compte réactivé."
      );
    },
    onError: () => {
      toast.error("Impossible de changer le statut du compte.");
    },
  });

  // ── Guards (after all hooks) ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <>
        <Topbar
          title="Détail utilisateur"
          subtitle="Chargement…"
          onMenuClick={onMenuClick}
        />
        <div className="page-container animate-slide-in flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Chargement du profil…</span>
          </div>
        </div>
      </>
    );
  }

  if (isError || !user) {
    return (
      <>
        <Topbar
          title="Détail utilisateur"
          subtitle="Utilisateur introuvable"
          onMenuClick={onMenuClick}
        />
        <div className="page-container animate-slide-in flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              Impossible de charger cet utilisateur.
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        </div>
      </>
    );
  }

  const displayName = user.full_name || user.username;
  const role = user.profile.role;
  const permissions = (user.profile.permissions ?? []) as Permission[];
  const isAdmin = role === "admin";
  const permissionCount = isAdmin ? ALL_PERMISSIONS.length : permissions.length;

  function handleEdit(values: EditUserFormValues) {
    updateMutation.mutate({
      first_name: values.first_name,
      last_name: values.last_name,
      username: values.username,
      email: values.email,
      role: values.role,
      phone: values.phone,
      profile_is_active: values.is_active_profile,
    });
  }

  const editDefaultValues: EditUserFormValues = {
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    role: user.profile.role,
    phone: user.profile.phone ?? "",
    is_active_profile: user.is_active,
  };

  return (
    <>
      <Topbar
        title={displayName}
        subtitle="Profil utilisateur"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in">
        {/* ── Back button ── */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>

        {/* ── Header card ── */}
        <div className="bg-card rounded-xl border border-border/70 p-5 mb-6 shadow-[0_1px_2px_rgba(120,60,20,0.04),0_8px_24px_-12px_rgba(120,60,20,0.08)]">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar + identity */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <UserAvatarLarge name={displayName} username={user.username} />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {displayName}
                </h2>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  @{user.username}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <RolePill role={role} />
                  <StatusBadge
                    label={user.is_active ? "Actif" : "Inactif"}
                    variant={user.is_active ? "success" : "default"}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[40px] rounded-lg gap-2"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={[
                  "min-h-[40px] rounded-lg gap-2",
                  user.is_active
                    ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                    : "border-success/40 text-success hover:bg-success/10",
                ].join(" ")}
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : user.is_active ? (
                  <UserX className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                {user.is_active ? "Désactiver" : "Réactiver"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Informations personnelles */}
            <SectionCard title="Informations personnelles">
              <div className="divide-y divide-border/50">
                <InfoRow
                  icon={Users}
                  label="Prénom"
                  value={user.first_name || "—"}
                />
                <InfoRow
                  icon={Users}
                  label="Nom"
                  value={user.last_name || "—"}
                />
                <InfoRow
                  icon={Mail}
                  label="Adresse email"
                  value={user.email || "—"}
                />
                <InfoRow
                  icon={AtSign}
                  label="Nom d'utilisateur"
                  value={`@${user.username}`}
                />
                <InfoRow
                  icon={Phone}
                  label="Téléphone"
                  value={user.profile.phone || "Non renseigné"}
                />
                <InfoRow
                  icon={Calendar}
                  label="Date d'inscription"
                  value={formatDateOnly(user.date_joined)}
                />
                <InfoRow
                  icon={Clock}
                  label="Dernière connexion"
                  value={
                    user.last_login
                      ? formatDateFr(user.last_login)
                      : "Jamais connecté"
                  }
                />
              </div>
            </SectionCard>

            {/* Section 3: Permissions */}
            <SectionCard
              title="Permissions"
              action={
                role === "vendeur" ? (
                  <Link
                    to="/admin/permissions"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Gérer
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : undefined
              }
            >
              {isAdmin ? (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Accès complet à toutes les fonctionnalités
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les administrateurs ont accès à l'intégralité du système
                      sans restriction.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {ALL_PERMISSIONS.map((p) => {
                    const granted = permissions.includes(p);
                    const Icon = PERMISSION_ICONS[p];
                    return (
                      <div
                        key={p}
                        className={[
                          "flex items-center gap-3 rounded-lg border px-4 py-2.5",
                          granted
                            ? "border-border/60 bg-muted/30"
                            : "border-border/30 bg-muted/10 opacity-50",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={granted}
                          readOnly
                          className="h-4 w-4 rounded border-input accent-primary cursor-default shrink-0"
                          aria-label={PERMISSION_LABELS[p]}
                        />
                        <Icon
                          className={[
                            "w-4 h-4 shrink-0",
                            granted ? "text-primary" : "text-muted-foreground",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "text-sm",
                            granted ? "text-foreground" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {PERMISSION_LABELS[p]}
                        </span>
                        {granted && (
                          <ShieldCheck className="w-3.5 h-3.5 text-success ml-auto shrink-0" />
                        )}
                        {!granted && (
                          <ShieldOff className="w-3.5 h-3.5 text-muted-foreground/50 ml-auto shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  {permissions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Aucune permission accordée
                    </p>
                  )}
                </div>
              )}
            </SectionCard>

            {/* Section 4: Activité récente */}
            <SectionCard title="Activité récente">
              {activityLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Chargement…</span>
                </div>
              ) : !activityLogs || activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Activity className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Aucune activité enregistrée.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {activityLogs.slice(0, 20).map((log) => {
                    const Icon = resolveActivityIcon(log.action, log.target_model);
                    const colorClass = resolveActivityColor(
                      log.action,
                      log.target_model
                    );
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div
                          className={[
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            colorClass,
                          ].join(" ")}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">
                            <span className="font-medium">{log.action}</span>
                            {log.target_model && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {log.target_model}
                                {log.target_id ? ` #${log.target_id}` : ""}
                              </span>
                            )}
                          </p>
                          {log.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {log.description}
                            </p>
                          )}
                          <span className="text-[11px] text-muted-foreground/60 mt-0.5 inline-block">
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Right column (1/3): Stats */}
          <div className="space-y-4">
            <StatCard
              label="Ventes réalisées"
              value={String(user.total_sales ?? 0)}
              numericValue={user.total_sales ?? 0}
              animated
              icon={ShoppingCart}
            />
            <StatCard
              label="Chiffre d'affaires"
              value={formatRevenue(user.total_revenue ?? 0)}
              numericValue={user.total_revenue ?? 0}
              animated
              icon={TrendingUp}
            />
            <StatCard
              label="Permissions accordées"
              value={String(permissionCount)}
              numericValue={permissionCount}
              animated
              icon={ShieldCheck}
            />

            {/* Quick actions card */}
            <div className="bg-card rounded-xl border border-border/70 overflow-hidden shadow-[0_1px_2px_rgba(120,60,20,0.04)]">
              <div className="px-5 py-4 border-b border-border/50">
                <h3 className="text-[13px] font-semibold text-foreground uppercase tracking-wide">
                  Actions rapides
                </h3>
              </div>
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/60 transition-colors text-left"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  Modifier le profil
                </button>
                {role === "vendeur" && (
                  <Link
                    to="/admin/permissions"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    Gérer les permissions
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                    user.is_active
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-success hover:bg-success/10",
                  ].join(" ")}
                >
                  {user.is_active ? (
                    <UserX className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  {user.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit modal ── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!updateMutation.isPending && !open) setEditOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
                <Pencil className="w-4 h-4" />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Modifier l'utilisateur
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {displayName}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-1">
            <EditUserForm
              defaultValues={editDefaultValues}
              onSubmit={handleEdit}
              onCancel={() => setEditOpen(false)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
