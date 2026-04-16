import { useOutletContext } from "react-router-dom";
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
import { Plus, Shield, User, Edit, Trash2, UserX, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTableManager } from "@/hooks/useTableManager";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "admin" | "vendeur";
type UserStatus = "active" | "inactive";

interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_USERS: AppUser[] = [
  { id: 1, name: "Admin Principal", email: "admin@naoservices.ga", role: "admin", status: "active", lastLogin: "14/04/2026 08:30" },
  { id: 2, name: "Fatou Mbaye", email: "fatou@naoservices.ga", role: "vendeur", status: "active", lastLogin: "14/04/2026 09:00" },
  { id: 3, name: "Moussa Diallo", email: "moussa@naoservices.ga", role: "vendeur", status: "active", lastLogin: "13/04/2026 18:45" },
  { id: 4, name: "Aïcha Nkoghe", email: "aicha@naoservices.ga", role: "vendeur", status: "inactive", lastLogin: "10/04/2026 12:00" },
];

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "vendeur"], { required_error: "Sélectionnez un rôle" }),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

const editUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  role: z.enum(["admin", "vendeur"], { required_error: "Sélectionnez un rôle" }),
  status: z.enum(["active", "inactive"], { required_error: "Sélectionnez un statut" }),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CreateUserFormProps {
  onSubmit: (values: CreateUserFormValues) => void;
  onCancel: () => void;
}

function CreateUserForm({ onSubmit, onCancel }: CreateUserFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", role: "vendeur", password: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="create-name">Nom complet <span className="text-destructive">*</span></Label>
        <Input id="create-name" placeholder="Ex : Fatou Mbaye" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
        <Input id="create-email" type="email" placeholder="utilisateur@naoservices.ga" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Rôle <span className="text-destructive">*</span></Label>
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
        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="create-password">Mot de passe temporaire <span className="text-destructive">*</span></Label>
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
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Créer l'utilisateur</Button>
      </DialogFooter>
    </form>
  );
}

interface EditUserFormProps {
  defaultValues: EditUserFormValues;
  onSubmit: (values: EditUserFormValues) => void;
  onCancel: () => void;
}

function EditUserForm({ defaultValues, onSubmit, onCancel }: EditUserFormProps) {
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
      <div className="space-y-1.5">
        <Label htmlFor="edit-name">Nom complet <span className="text-destructive">*</span></Label>
        <Input id="edit-name" placeholder="Ex : Fatou Mbaye" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-email">Email <span className="text-destructive">*</span></Label>
        <Input id="edit-email" type="email" placeholder="utilisateur@naoservices.ga" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Rôle</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit">Enregistrer</Button>
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
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [revokingUser, setRevokingUser] = useState<AppUser | null>(null);
  const [roleFilter, setRoleFilter] = useState("");

  // Pré-filtre par rôle
  const roleFiltered = roleFilter
    ? users.filter((u) => u.role === roleFilter)
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
    searchKeys: ["name", "email"] as never[],
  });

  const typedPaginated = paginated as unknown as AppUser[];
  const allPageIds = typedPaginated.map((u) => u.id);

  function handleCreate(values: CreateUserFormValues) {
    const newUser: AppUser = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      name: values.name,
      email: values.email,
      role: values.role,
      status: "active",
      lastLogin: "Jamais",
    };
    setUsers(prev => [...prev, newUser]);
    setShowCreate(false);
  }

  function handleEdit(values: EditUserFormValues) {
    if (!editingUser) return;
    setUsers(prev =>
      prev.map(u =>
        u.id === editingUser.id ? { ...u, ...values } : u
      )
    );
    setEditingUser(null);
  }

  function handleRevoke() {
    if (!revokingUser) return;
    setUsers(prev => prev.filter(u => u.id !== revokingUser.id));
    setRevokingUser(null);
  }

  function handleDisableSelection() {
    setUsers(prev =>
      prev.map(u =>
        selectedIds.has(u.id) ? { ...u, status: "inactive" as UserStatus } : u
      )
    );
    clearSelection();
  }

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
          bulkActions={
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisableSelection}
              className="border-warning text-warning hover:bg-warning/10"
            >
              <UserX className="w-3.5 h-3.5 mr-1.5" />
              Désactiver la sélection
            </Button>
          }
          filterValue={roleFilter}
          filterOptions={ROLE_FILTER_OPTIONS}
          filterPlaceholder="Tous les rôles"
          onFilterChange={(val) => {
            setRoleFilter(val);
            clearSelection();
          }}
        />

        {/* Desktop : tableau normal */}
        <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 px-4">
                    <span className="sr-only">Sélection</span>
                  </th>
                  <SortableHeader label="Utilisateur" sortKey="name" currentSort={sort} onSort={toggleSort} />
                  <th>Email</th>
                  <SortableHeader label="Rôle" sortKey="role" currentSort={sort} onSort={toggleSort} />
                  <th>Statut</th>
                  <th>Dernière connexion</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {typedPaginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
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
                        aria-label={`Sélectionner ${user.name}`}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground">{user.email}</td>
                    <td>
                      <StatusBadge
                        label={user.role === "admin" ? "Admin" : "Vendeur"}
                        variant={user.role === "admin" ? "info" : "default"}
                      />
                    </td>
                    <td>
                      <StatusBadge
                        label={user.status === "active" ? "Actif" : "Inactif"}
                        variant={user.status === "active" ? "success" : "default"}
                      />
                    </td>
                    <td className="text-muted-foreground text-xs">{user.lastLogin}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title="Modifier"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title="Révoquer l'accès"
                          onClick={() => setRevokingUser(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile : card list */}
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
                    aria-label={`Sélectionner ${user.name}`}
                  />
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-sm truncate">{user.name}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <StatusBadge
                    label={user.role === "admin" ? "Admin" : "Vendeur"}
                    variant={user.role === "admin" ? "info" : "default"}
                  />
                  <StatusBadge
                    label={user.status === "active" ? "Actif" : "Inactif"}
                    variant={user.status === "active" ? "success" : "default"}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2 truncate">{user.email}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Connexion : <strong className="text-foreground">{user.lastLogin}</strong>
                </span>
                <div className="flex gap-1">
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title="Modifier"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title="Révoquer l'accès"
                    onClick={() => setRevokingUser(user)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal : Nouvel utilisateur ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <CreateUserForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* ── Modal : Modifier utilisateur ── */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <EditUserForm
              defaultValues={{
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
                status: editingUser.status,
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog : Révoquer accès ── */}
      <AlertDialog open={!!revokingUser} onOpenChange={open => { if (!open) setRevokingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer l'accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              Révoquer l'accès de <strong>{revokingUser?.name}</strong> supprimera définitivement
              son compte. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
            >
              Révoquer l'accès
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
