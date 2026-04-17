import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { useState } from "react";
import { useTableManager } from "@/hooks/useTableManager";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/components/ui/use-toast";
import { userService, type UserListItem } from "@/services/userService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "admin" | "vendeur";

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

// ─── Main page ────────────────────────────────────────────────────────────────

const ROLE_FILTER_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "vendeur", label: "Vendeur" },
];

export default function UsersPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [revokingUser, setRevokingUser] = useState<UserListItem | null>(null);
  const [roleFilter, setRoleFilter] = useState("");

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
      setShowCreate(false);
      toast({ title: "Utilisateur créé avec succès." });
    },
    onError: () => {
      toast({
        title: "Erreur lors de la création",
        description: "Vérifiez les informations saisies.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRevokingUser(null);
      toast({ title: "Accès révoqué." });
    },
    onError: () => {
      toast({
        title: "Erreur lors de la révocation",
        variant: "destructive",
      });
    },
  });

  // ── Filtering ─────────────────────────────────────────────────────────────

  const roleFiltered = roleFilter
    ? users.filter((u) => u.profile.role === (roleFilter as UserRole))
    : users;

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
  } = useTableManager(roleFiltered as unknown as Record<string, unknown>[], {
    searchKeys: ["full_name", "email", "username"] as never[],
  });

  const typedPaginated = paginated as unknown as UserListItem[];
  const allPageIds = typedPaginated.map((u) => u.id);

  function handleCreate(values: CreateUserFormValues) {
    createMutation.mutate(values);
  }

  function handleRevoke() {
    if (!revokingUser) return;
    deleteMutation.mutate(revokingUser.id);
  }

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.profile.role === "admin").length;
  const vendeurCount = totalUsers - adminCount;

  // ── Render ────────────────────────────────────────────────────────────────

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
              <p className="text-xs text-muted-foreground mt-0.5">
                {adminCount} admin{adminCount > 1 ? "s" : ""} ·{" "}
                {vendeurCount} vendeur{vendeurCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowCreate(true)}
            className="shrink-0 min-h-[44px] rounded-lg text-primary-foreground shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)] hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.7)] transition-shadow"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.82) 100%)",
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
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
                    <th className="w-20">Actions</th>
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
                          <button
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                            title="Révoquer l'accès"
                            aria-label={`Révoquer l'accès de ${displayName}`}
                            onClick={() => setRevokingUser(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
            {typedPaginated.map((user) => {
              const displayName = user.full_name || user.username;
              return (
                <div
                  key={user.id}
                  className={[
                    "bg-card border rounded-xl p-4 flex items-start gap-3 transition-all duration-150 shadow-[0_1px_2px_rgba(120,60,20,0.04)]",
                    isSelected(user.id)
                      ? "border-primary/60 bg-primary/[0.04] shadow-[0_6px_20px_-12px_hsl(var(--primary)/0.45)]"
                      : "border-border/70",
                  ].join(" ")}
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
                  <button
                    className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                    title="Révoquer l'accès"
                    aria-label={`Révoquer l'accès de ${displayName}`}
                    onClick={() => setRevokingUser(user)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal : Nouvel utilisateur ── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!createMutation.isPending) setShowCreate(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <CreateUserForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog : Révoquer accès ── */}
      <AlertDialog
        open={!!revokingUser}
        onOpenChange={(open) => {
          if (!open) setRevokingUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l'accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              Révoquer l'accès de{" "}
              <strong>{revokingUser?.full_name || revokingUser?.username}</strong>{" "}
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
