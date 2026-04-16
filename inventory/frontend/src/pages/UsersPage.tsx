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
import { Plus, Shield, User, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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
          <Label htmlFor="create-first-name">
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input id="create-first-name" placeholder="Ex : Fatou" {...register("first_name")} />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="create-last-name">
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input id="create-last-name" placeholder="Ex : Mbaye" {...register("last_name")} />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-username">
          Nom d'utilisateur <span className="text-destructive">*</span>
        </Label>
        <Input
          id="create-username"
          placeholder="Ex : fatou.mbaye"
          {...register("username")}
        />
        {errors.username && (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="create-email"
          type="email"
          placeholder="utilisateur@naoservices.ga"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>
            Rôle <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
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
          <Label htmlFor="create-phone">Téléphone</Label>
          <Input
            id="create-phone"
            placeholder="+241 07 XX XX XX"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-password">
          Mot de passe temporaire <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="create-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar title="Utilisateurs" subtitle="Gestion des comptes et des rôles" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Rôles : Admin, Vendeur</span>
          </div>
          <Button className="shrink-0 sm:ml-auto" onClick={() => setShowCreate(true)}>
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

        {/* Desktop : tableau normal */}
        {!isLoading && !isError && (
          <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10 px-4">
                      <span className="sr-only">Sélection</span>
                    </th>
                    <SortableHeader label="Utilisateur" sortKey="full_name" currentSort={sort} onSort={toggleSort} />
                    <th>Email</th>
                    <SortableHeader label="Rôle" sortKey="profile.role" currentSort={sort} onSort={toggleSort} />
                    <th>Statut</th>
                    <th className="w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typedPaginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                  {typedPaginated.map((user) => (
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
                          aria-label={`Sélectionner ${user.full_name}`}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium block">{user.full_name || user.username}</span>
                            <span className="text-xs text-muted-foreground">@{user.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{user.email}</td>
                      <td>
                        <StatusBadge
                          label={user.profile.role === "admin" ? "Admin" : "Vendeur"}
                          variant={user.profile.role === "admin" ? "info" : "default"}
                        />
                      </td>
                      <td>
                        <StatusBadge
                          label={user.is_active ? "Actif" : "Inactif"}
                          variant={user.is_active ? "success" : "default"}
                        />
                      </td>
                      <td>
                        <button
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title="Révoquer l'accès"
                          onClick={() => setRevokingUser(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mobile : card list */}
        {!isLoading && !isError && (
          <div className="md:hidden space-y-2">
            {typedPaginated.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucun utilisateur trouvé.
              </div>
            )}
            {typedPaginated.map((user) => (
              <div
                key={user.id}
                className={`bg-card border rounded-lg p-3 ${isSelected(user.id) ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected(user.id)}
                      onChange={() => toggleRow(user.id)}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                      aria-label={`Sélectionner ${user.full_name}`}
                    />
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="font-medium text-sm truncate">{user.full_name || user.username}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <StatusBadge
                      label={user.profile.role === "admin" ? "Admin" : "Vendeur"}
                      variant={user.profile.role === "admin" ? "info" : "default"}
                    />
                    <StatusBadge
                      label={user.is_active ? "Actif" : "Inactif"}
                      variant={user.is_active ? "success" : "default"}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2 truncate">{user.email}</div>
                <div className="flex items-center justify-end">
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title="Révoquer l'accès"
                    onClick={() => setRevokingUser(user)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal : Nouvel utilisateur ── */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!createMutation.isPending) setShowCreate(open); }}>
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
      <AlertDialog open={!!revokingUser} onOpenChange={(open) => { if (!open) setRevokingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l'accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              Révoquer l'accès de{" "}
              <strong>{revokingUser?.full_name || revokingUser?.username}</strong> supprimera
              définitivement son compte. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Révoquer l'accès
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
