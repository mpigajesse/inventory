import { useState, useEffect } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
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
  Crown,
  Zap,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  userService,
  type UserUpdatePayload,
} from "@/services/userService";
import { api } from "@/lib/api";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import type { Permission } from "@/hooks/usePermissions";
import { Link } from "react-router-dom";
import { getRoleLabel } from "@/lib/roleLabel";
import { useAuth } from "@/contexts/AuthContext";

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
  genre: z.enum(["M", "F", "NC"]).optional(),
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

// ─── User stats type ──────────────────────────────────────────────────────────

interface UserStats {
  today_sales_count: number;
  today_sales_revenue: number;
  week_sales_count: number;
  week_sales_revenue: number;
  month_sales_count: number;
  month_sales_revenue: number;
  last_sale_at: string | null;
  last_sale_amount: number | null;
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

function resolveActivityIcon(action: string, targetModel: string): React.ElementType {
  const model = (targetModel ?? "").toLowerCase();
  const act = (action ?? "").toLowerCase();
  if (model === "sale" || model === "saleitem") return ShoppingCart;
  if (model === "product") return Package;
  if (model === "stock" || model === "stockmovement") return Package;
  if (act === "login" || act === "logout") return LogIn;
  if (act === "create") return Plus;
  if (act === "delete") return Minus;
  if (act === "update") return RefreshCw;
  return Activity;
}

/** Returns { bg, text } style strings for each action type per spec:
 *  sale=copper, login=blue, create=green, delete=red, update=amber */
function resolveActivityStyles(action: string, targetModel: string): { bg: string; text: string } {
  const model = (targetModel ?? "").toLowerCase();
  const act = (action ?? "").toLowerCase();
  const isSale = act === "sale" || model === "sale" || model === "saleitem";
  const isLogin = act === "login" || act === "logout";
  const isCreate = act === "create";
  const isDelete = act === "delete";
  const isUpdate = act === "update";

  if (isSale) return { bg: "hsl(22 72% 48% / 0.12)", text: "hsl(22 72% 48%)" };     // copper
  if (isLogin) return { bg: "hsl(210 70% 52% / 0.12)", text: "hsl(210 70% 52%)" };  // blue
  if (isCreate) return { bg: "hsl(152 38% 38% / 0.12)", text: "hsl(152 38% 38%)" }; // green
  if (isDelete) return { bg: "hsl(0 70% 50% / 0.12)", text: "hsl(0 70% 50%)" };     // red
  if (isUpdate) return { bg: "hsl(38 92% 50% / 0.12)", text: "hsl(38 92% 42%)" };   // amber
  return { bg: "hsl(var(--muted) / 0.6)", text: "hsl(var(--muted-foreground))" };
}

function resolveActivityColor(action: string, targetModel: string): string {
  const model = (targetModel ?? "").toLowerCase();
  const act = (action ?? "").toLowerCase();
  if (model === "sale" || model === "saleitem")
    return "bg-[hsl(152_38%_38%/0.1)] text-[hsl(152_38%_38%)]";
  if (model === "product")
    return "bg-[hsl(22_72%_48%/0.1)] text-[hsl(22_72%_48%)]";
  if (model === "stock" || model === "stockmovement")
    return "bg-amber-500/10 text-amber-600";
  if (act === "login" || act === "logout") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

/** Group activity logs by calendar day label */
function groupByDay(logs: { created_at: string }[]): Map<string, typeof logs> {
  const map = new Map<string, typeof logs>();
  for (const log of logs) {
    const label = formatDateOnly(log.created_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(log);
  }
  return map;
}

// ─── Premium KPI Card ─────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: "copper" | "green" | "blue";
}

function KpiCard({ label, value, icon: Icon, accent = "copper" }: KpiCardProps) {
  const colors = {
    copper: { bg: "hsl(22 72% 48% / 0.08)", icon: "hsl(22 72% 48%)", border: "hsl(22 72% 48% / 0.2)" },
    green: { bg: "hsl(152 38% 38% / 0.08)", icon: "hsl(152 38% 38%)", border: "hsl(152 38% 38% / 0.2)" },
    blue: { bg: "hsl(210 70% 52% / 0.08)", icon: "hsl(210 70% 52%)", border: "hsl(210 70% 52% / 0.2)" },
  };
  const c = colors[accent];

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        border: `1px solid hsl(var(--border) / 0.7)`,
        borderTop: `3px solid ${c.icon}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: c.icon, width: "18px", height: "18px" }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-0.5">
          {label}
        </p>
        <p className="text-base font-extrabold text-foreground leading-tight truncate">{value}</p>
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
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border) / 0.7)",
        boxShadow: "0 1px 2px rgba(120,60,20,0.04), 0 8px 24px -12px rgba(120,60,20,0.08)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div
            className="h-4 rounded-full shrink-0"
            style={{
              width: "3px",
              background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
            }}
          />
          <h3
            className="text-[13px] text-foreground uppercase tracking-wide"
            style={{ fontWeight: 800, letterSpacing: "-0.01em" }}
          >
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
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
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div
        className="flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: "hsl(22 72% 48% / 0.08)",
          borderRadius: "8px",
          padding: "6px",
          width: "30px",
          height: "30px",
        }}
      >
        <Icon style={{ width: "14px", height: "14px", color: "hsl(22 72% 48%)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={FIELD_LABEL_CLASSES}>{label}</p>
        <p className="text-sm text-foreground mt-0.5 break-words">{value}</p>
      </div>
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
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="detail-first-name" className={FIELD_LABEL_CLASSES}>
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input id="detail-first-name" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("first_name")} />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="detail-last-name" className={FIELD_LABEL_CLASSES}>
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input id="detail-last-name" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("last_name")} />
          {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-username" className={FIELD_LABEL_CLASSES}>
          Nom d'utilisateur <span className="text-destructive">*</span>
        </Label>
        <Input id="detail-username" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("username")} />
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-email" className={FIELD_LABEL_CLASSES}>
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="detail-email" type="email" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASSES}>
            Rôle <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="h-11 rounded-xl border-border/80">
                  <SelectValue placeholder="Rôle" />
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
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className={FIELD_LABEL_CLASSES}>Civilité</Label>
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
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="detail-phone" className={FIELD_LABEL_CLASSES}>Téléphone</Label>
        <Input id="detail-phone" placeholder="+241 07 XX XX XX" className="h-11 rounded-xl border-border/80 focus-visible:ring-1 focus-visible:ring-[hsl(22_72%_48%/0.5)] focus-visible:border-[hsl(22_72%_48%/0.6)]" {...register("phone")} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <Label className={FIELD_LABEL_CLASSES}>Statut du compte</Label>
          <p className="text-xs text-muted-foreground">Activer ou désactiver l'accès</p>
        </div>
        <Controller
          control={control}
          name="is_active_profile"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Statut du compte" />
          )}
        />
      </div>

      <DialogFooter className="gap-2 sm:gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="min-h-[44px] rounded-xl">
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
  const { currentUser } = useAuth();
  const isSelf = currentUser ? String(id) === currentUser.id : false;

  const [editOpen, setEditOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animations on mount
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", id],
    queryFn: () => api.get<UserStats>(`/users/${id}/stats/`).then((r) => r.data),
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
        <Topbar title="Détail utilisateur" subtitle="Chargement…" onMenuClick={onMenuClick} />
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
        <Topbar title="Détail utilisateur" subtitle="Utilisateur introuvable" onMenuClick={onMenuClick} />
        <div className="page-container animate-slide-in flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">Impossible de charger cet utilisateur.</p>
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
  const memberSince = formatDateOnly(user.date_joined);
  const userInitials = getInitialsFromName(displayName, user.username);

  function handleEdit(values: EditUserFormValues) {
    updateMutation.mutate({
      first_name: values.first_name,
      last_name: values.last_name,
      username: values.username,
      email: values.email,
      role: values.role,
      genre: (!values.genre || values.genre === "NC") ? null : values.genre,
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
    genre: (user.profile.genre ?? "NC") as "M" | "F" | "NC",
    phone: user.profile.phone ?? "",
    is_active_profile: user.profile.is_active,
  };

  return (
    <>
      <Topbar title={displayName} subtitle="Profil utilisateur" onMenuClick={onMenuClick} />

      <div className="page-container animate-slide-in">

        {/* ── Back button ── */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Retour
          </button>
        </div>

        {/* ── Hero Card — dark/copper premium ── */}
        <div
          className="relative overflow-hidden rounded-2xl mb-6 p-6"
          style={{
            background: "linear-gradient(135deg, hsl(20 30% 8%) 0%, hsl(22 26% 13%) 100%)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "none" : "translateY(-8px)",
            transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
          }}
        >
          {/* Diagonal pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.06,
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(22 72% 48%) 0px, hsl(22 72% 48%) 1px, transparent 1px, transparent 15px)",
            }}
          />

          {/* Glow radial cuivre haut-droite */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "-30px",
              right: "-30px",
              width: "220px",
              height: "220px",
              background: "radial-gradient(circle at 60% 40%, hsl(22 72% 48% / 0.28) 0%, hsl(36 88% 52% / 0.12) 45%, transparent 70%)",
              borderRadius: "50%",
            }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Grand avatar */}
            <div
              className="flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: isAdmin
                  ? "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))"
                  : "linear-gradient(135deg, hsl(210 70% 48%), hsl(220 75% 60%))",
                boxShadow: isAdmin
                  ? "0 8px 24px hsl(22 72% 48% / 0.3)"
                  : "0 8px 24px hsl(210 70% 48% / 0.3)",
              }}
              aria-hidden="true"
            >
              {userInitials}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <h2
                className="text-xl font-extrabold text-white leading-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {displayName}
              </h2>
              <p className="text-white/50 text-sm font-mono mt-0.5">@{user.username}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {/* Role badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={
                    isAdmin
                      ? { background: "hsl(22 72% 48% / 0.3)", color: "hsl(22 72% 72%)" }
                      : { background: "hsl(210 70% 52% / 0.3)", color: "hsl(210 70% 78%)" }
                  }
                >
                  {isAdmin ? <Crown className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                  {getRoleLabel(role, user.profile.genre)}
                </span>
                {/* Active status */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={
                    user.is_active
                      ? { background: "hsl(152 38% 38% / 0.25)", color: "hsl(152 50% 60%)" }
                      : { background: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-foreground))" }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                  {user.is_active ? "Actif" : "Inactif"}
                </span>
                <span className="text-white/30 text-xs">Membre depuis {memberSince}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 sm:shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: "hsl(22 72% 48% / 0.2)",
                  color: "hsl(22 72% 72%)",
                  border: "1px solid hsl(22 72% 48% / 0.3)",
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
              {!isSelf && (
              <button
                type="button"
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={
                  user.is_active
                    ? { background: "hsl(0 70% 50% / 0.2)", color: "hsl(0 80% 72%)", border: "1px solid hsl(0 70% 50% / 0.3)" }
                    : { background: "hsl(152 38% 38% / 0.2)", color: "hsl(152 50% 65%)", border: "1px solid hsl(152 38% 38% / 0.3)" }
                }
              >
                {activateMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : user.is_active ? (
                  <UserX className="w-3.5 h-3.5" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                {user.is_active ? "Désactiver" : "Réactiver"}
              </button>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {([
            { label: "Ventes réalisées", value: String(user.total_sales ?? 0), icon: ShoppingCart, accent: "copper" as const },
            { label: "Chiffre d'affaires", value: formatRevenue(user.total_revenue ?? 0), icon: TrendingUp, accent: "green" as const },
            { label: "Permissions accordées", value: `${permissionCount} / ${ALL_PERMISSIONS.length}`, icon: ShieldCheck, accent: "blue" as const },
          ] as const).map((kpi, i) => (
            <div
              key={kpi.label}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "none" : "translateY(8px)",
                transition: `opacity 0.35s ease-out ${300 + i * 80}ms, transform 0.35s ease-out ${300 + i * 80}ms`,
              }}
            >
              <KpiCard label={kpi.label} value={kpi.value} icon={kpi.icon} accent={kpi.accent} />
            </div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column (2/3) — on mobile, shown after the right column via order */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">

            {/* Informations personnelles */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "opacity 0.4s ease-out 540ms, transform 0.4s ease-out 540ms" }}>
            <SectionCard title="Informations personnelles">
              <div className="divide-y divide-border/40">
                <InfoRow icon={Users} label="Prénom" value={user.first_name || "—"} />
                <InfoRow icon={Users} label="Nom" value={user.last_name || "—"} />
                <InfoRow icon={Mail} label="Adresse email" value={user.email || "—"} />
                <InfoRow icon={AtSign} label="Nom d'utilisateur" value={`@${user.username}`} />
                <InfoRow icon={Phone} label="Téléphone" value={user.profile.phone || "Non renseigné"} />
                <InfoRow icon={Calendar} label="Date d'inscription" value={formatDateOnly(user.date_joined)} />
                <InfoRow
                  icon={Clock}
                  label="Dernière connexion"
                  value={user.last_login ? formatDateFr(user.last_login) : "Jamais connecté"}
                />
              </div>
            </SectionCard>
            </div>

            {/* Permissions */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "opacity 0.4s ease-out 640ms, transform 0.4s ease-out 640ms" }}>
            <SectionCard
              title="Permissions"
              action={
                role === "vendeur" ? (
                  <Link
                    to="/admin/permissions"
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-colors"
                    style={{ color: "hsl(22 72% 48%)" }}
                  >
                    Gérer
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : undefined
              }
            >
              {isAdmin ? (
                <div
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, hsl(22 72% 48% / 0.06), hsl(36 88% 52% / 0.04))",
                    border: "1px solid hsl(22 72% 48% / 0.2)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "hsl(22 72% 48% / 0.12)" }}
                  >
                    <Zap className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Accès complet à toutes les fonctionnalités
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Les administrateurs ont accès à l'intégralité du système sans restriction.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {permissions.map((p) => (
                        <span
                          key={p}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: "hsl(22 72% 48% / 0.1)", color: "hsl(22 72% 48%)" }}
                        >
                          {PERMISSION_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  )}
                  {ALL_PERMISSIONS.map((p) => {
                    const granted = permissions.includes(p);
                    const Icon = PERMISSION_ICONS[p];
                    return (
                      <div
                        key={p}
                        className="flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors"
                        style={{
                          borderColor: granted ? "hsl(22 72% 48% / 0.2)" : "hsl(var(--border) / 0.3)",
                          background: granted ? "hsl(22 72% 48% / 0.04)" : "hsl(var(--muted) / 0.1)",
                          opacity: granted ? 1 : 0.5,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={granted}
                          readOnly
                          className="h-4 w-4 rounded border-input cursor-default shrink-0"
                          style={{ accentColor: "hsl(22 72% 48%)", transition: "accent-color 0.2s, opacity 0.2s" }}
                          aria-label={PERMISSION_LABELS[p]}
                        />
                        <Icon
                          className="w-4 h-4 shrink-0"
                          style={{ color: granted ? "hsl(22 72% 48%)" : "hsl(var(--muted-foreground))" }}
                        />
                        <span
                          className="text-sm"
                          style={{ color: granted ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                        >
                          {PERMISSION_LABELS[p]}
                        </span>
                        {granted ? (
                          <ShieldCheck
                            className="w-3.5 h-3.5 ml-auto shrink-0"
                            style={{ color: "hsl(152 38% 38%)" }}
                          />
                        ) : (
                          <ShieldOff className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto shrink-0" />
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
            </div>

            {/* ── Performance & Activité ── */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "opacity 0.4s ease-out 740ms, transform 0.4s ease-out 740ms" }}>
            <SectionCard title="Performance &amp; Activité">
              {/* ── Stats summary cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {([
                  {
                    label: "Ventes aujourd'hui",
                    count: userStats?.today_sales_count ?? 0,
                    revenue: userStats?.today_sales_revenue ?? 0,
                    accent: "copper" as const,
                    icon: ShoppingCart,
                  },
                  {
                    label: "Ventes cette semaine",
                    count: userStats?.week_sales_count ?? 0,
                    revenue: userStats?.week_sales_revenue ?? 0,
                    accent: "green" as const,
                    icon: TrendingUp,
                  },
                  {
                    label: "Ventes ce mois",
                    count: userStats?.month_sales_count ?? 0,
                    revenue: userStats?.month_sales_revenue ?? 0,
                    accent: "blue" as const,
                    icon: Calendar,
                  },
                ]).map(({ label, count, revenue, accent, icon: Icon }) => {
                  const colors = {
                    copper: { bg: "hsl(22 72% 48% / 0.08)", icon: "hsl(22 72% 48%)", border: "hsl(22 72% 48% / 0.2)", top: "hsl(22 72% 48%)" },
                    green: { bg: "hsl(152 38% 38% / 0.08)", icon: "hsl(152 38% 38%)", border: "hsl(152 38% 38% / 0.2)", top: "hsl(152 38% 38%)" },
                    blue: { bg: "hsl(210 70% 52% / 0.08)", icon: "hsl(210 70% 52%)", border: "hsl(210 70% 52% / 0.2)", top: "hsl(210 70% 52%)" },
                  };
                  const c = colors[accent];
                  return (
                    <div
                      key={label}
                      className="rounded-xl p-3.5 flex items-start gap-3"
                      style={{
                        background: "hsl(var(--muted) / 0.3)",
                        border: `1px solid hsl(var(--border) / 0.5)`,
                        borderTop: `3px solid ${c.top}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <Icon style={{ width: "15px", height: "15px", color: c.icon }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-0.5">
                          {label}
                        </p>
                        <p className="text-sm font-extrabold text-foreground leading-tight">
                          {count} vente{count !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRevenue(revenue)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Last sale banner ── */}
              {(userStats?.last_sale_at || userStats?.last_sale_amount != null) && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                  style={{
                    background: "linear-gradient(135deg, hsl(22 72% 48% / 0.07), hsl(36 88% 52% / 0.04))",
                    border: "1px solid hsl(22 72% 48% / 0.2)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(22 72% 48% / 0.12)" }}
                  >
                    <ShoppingCart style={{ width: "14px", height: "14px", color: "hsl(22 72% 48%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                      Dernière vente
                    </p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {userStats.last_sale_at ? formatDateFr(userStats.last_sale_at) : "—"}
                    </p>
                  </div>
                  {userStats.last_sale_amount != null && (
                    <span
                      className="text-sm font-extrabold shrink-0 px-3 py-1 rounded-full"
                      style={{
                        background: "hsl(22 72% 48% / 0.12)",
                        color: "hsl(22 72% 48%)",
                      }}
                    >
                      {formatRevenue(userStats.last_sale_amount)}
                    </span>
                  )}
                </div>
              )}

              {/* ── Activity timeline grouped by day ── */}
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
                <div className="space-y-5">
                  {Array.from(groupByDay(activityLogs.slice(0, 40))).map(([dayLabel, dayLogs]) => (
                    <div key={dayLabel}>
                      {/* Day header */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <span
                          className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
                          style={{
                            background: "hsl(var(--muted) / 0.6)",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        >
                          {dayLabel}
                        </span>
                        <div className="flex-1 h-px bg-border/40" />
                      </div>

                      {/* Entries for this day */}
                      <div className="space-y-0.5">
                        {(dayLogs as typeof activityLogs).map((log, logIdx) => {
                          const Icon = resolveActivityIcon(log.action, log.target_model);
                          const styles = resolveActivityStyles(log.action, log.target_model);
                          const isSaleEntry =
                            (log.action ?? "").toLowerCase() === "sale" ||
                            (log.target_model ?? "").toLowerCase() === "sale" ||
                            (log.target_model ?? "").toLowerCase() === "saleitem";
                          return (
                            <div
                              key={log.id}
                              className="flex items-start gap-3 py-2.5 border-b border-border/25 last:border-0"
                              style={{
                                animationDelay: `${logIdx * 30}ms`,
                                animation: "slideInUp 0.22s ease forwards",
                                opacity: 0,
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                style={{ background: styles.bg, color: styles.text }}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm text-foreground leading-snug">
                                    <span className="font-medium">{log.action}</span>
                                    {log.target_model && (
                                      <span className="text-muted-foreground">
                                        {" "}— {log.target_model}
                                        {log.target_id ? ` #${log.target_id}` : ""}
                                      </span>
                                    )}
                                  </p>
                                  {/* Sale amount badge */}
                                  {isSaleEntry && log.sale_amount != null && (
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                      style={{
                                        background: "hsl(22 72% 48% / 0.12)",
                                        color: "hsl(22 72% 48%)",
                                      }}
                                    >
                                      {formatRevenue(log.sale_amount)}
                                    </span>
                                  )}
                                </div>
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
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
            </div>
          </div>

          {/* Right column (1/3): Quick actions — shown first on mobile */}
          <div className="space-y-4 order-1 lg:order-2">

            {/* Quick actions card */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "opacity 0.4s ease-out 540ms, transform 0.4s ease-out 540ms" }}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border) / 0.7)",
                boxShadow: "0 1px 2px rgba(120,60,20,0.04)",
              }}
            >
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/50">
                <div
                  className="h-4 rounded-full shrink-0"
                  style={{
                    width: "3px",
                    background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
                  }}
                />
                <h3
                  className="text-[13px] text-foreground uppercase tracking-wide"
                  style={{ fontWeight: 800, letterSpacing: "-0.01em" }}
                >
                  Actions rapides
                </h3>
              </div>
              <div className="p-4 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground transition-colors text-left"
                  style={{ borderRadius: "12px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(22 72% 48% / 0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsl(22 72% 48% / 0.1)" }}
                  >
                    <Pencil className="w-3.5 h-3.5" style={{ color: "hsl(22 72% 48%)" }} />
                  </div>
                  Modifier le profil
                </button>
                {role === "vendeur" && (
                  <Link
                    to="/admin/permissions"
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-foreground transition-colors"
                    style={{ borderRadius: "12px" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "hsl(22 72% 48% / 0.08)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "hsl(22 72% 48% / 0.1)" }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: "hsl(22 72% 48%)" }} />
                    </div>
                    Gérer les permissions
                  </Link>
                )}
                {!isSelf && (
                <button
                  type="button"
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors text-left disabled:opacity-50"
                  style={
                    user.is_active
                      ? { color: "hsl(var(--destructive))", borderRadius: "12px" }
                      : { color: "hsl(152 38% 38%)", borderRadius: "12px" }
                  }
                  onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(22 72% 48% / 0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: user.is_active
                        ? "hsl(var(--destructive) / 0.1)"
                        : "hsl(152 38% 38% / 0.1)",
                    }}
                  >
                    {user.is_active ? (
                      <UserX className="w-3.5 h-3.5" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {user.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                </button>
                )}
              </div>
            </div>
            </div>

            {/* Last login card */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "opacity 0.4s ease-out 640ms, transform 0.4s ease-out 640ms" }}>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border) / 0.7)",
              }}
            >
              <p className={[FIELD_LABEL_CLASSES, "mb-1"].join(" ")}>Dernière connexion</p>
              <p className="text-sm font-semibold text-foreground">
                {user.last_login ? formatDateFr(user.last_login) : "Jamais connecté"}
              </p>
              <p className={[FIELD_LABEL_CLASSES, "mt-3 mb-1"].join(" ")}>Membre depuis</p>
              <p className="text-sm font-semibold text-foreground">{memberSince}</p>
            </div>
            </div>

            {/* Role info card */}
            <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "none" : "translateY(10px)", transition: "opacity 0.4s ease-out 740ms, transform 0.4s ease-out 740ms" }}>
            <div
              className="rounded-2xl p-4"
              style={{
                background: isAdmin
                  ? "linear-gradient(135deg, hsl(22 72% 48% / 0.06), hsl(36 88% 52% / 0.04))"
                  : "linear-gradient(135deg, hsl(210 70% 52% / 0.06), hsl(220 75% 60% / 0.04))",
                border: `1px solid ${isAdmin ? "hsl(22 72% 48% / 0.2)" : "hsl(210 70% 52% / 0.2)"}`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isAdmin ? "hsl(22 72% 48% / 0.15)" : "hsl(210 70% 52% / 0.15)",
                  }}
                >
                  {isAdmin ? (
                    <Crown className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
                  ) : (
                    <ShoppingBag className="w-4 h-4" style={{ color: "hsl(210 70% 52%)" }} />
                  )}
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: isAdmin ? "hsl(22 72% 48%)" : "hsl(210 70% 52%)" }}
                  >
                    {getRoleLabel(role, user.profile.genre)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin
                  ? "Accès complet à toutes les fonctionnalités et paramètres du système."
                  : `${permissionCount} permission${permissionCount > 1 ? "s" : ""} accordée${permissionCount > 1 ? "s" : ""} sur ${ALL_PERMISSIONS.length} disponibles.`}
              </p>
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
        <DialogContent className="sm:max-w-md data-[state=open]:animate-[formCardEntrance_0.35s_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl max-h-[90dvh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                style={{ background: "hsl(22 72% 48% / 0.1)" }}
              >
                <Pencil className="w-4 h-4" style={{ color: "hsl(22 72% 48%)" }} />
              </span>
              <div>
                <DialogTitle className="text-base font-bold">Modifier l'utilisateur</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{displayName}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-2 overflow-y-auto flex-1 min-h-0">
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
