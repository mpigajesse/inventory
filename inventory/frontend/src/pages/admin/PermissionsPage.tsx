import { useOutletContext, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Package,
  Boxes,
  Users,
  FileText,
  ShoppingCart,
  BarChart2,
  QrCode,
  Truck,
  Settings,
  UserCog,
  Save,
  ChevronDown,
  Shield,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Topbar } from "@/components/layout/Topbar";
import { userService, type UserListItem } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import type { Permission } from "@/hooks/usePermissions";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

// ─── Permission definitions ───────────────────────────────────────────────────

interface PermissionDef {
  key: Permission;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

const PERMISSIONS: PermissionDef[] = [
  { key: "manage_products",  label: "Gérer les produits",     shortLabel: "Produits",      icon: Package      },
  { key: "manage_stock",     label: "Gérer le stock",         shortLabel: "Stock",         icon: Boxes        },
  { key: "manage_clients",   label: "Gérer les clients",      shortLabel: "Clients",       icon: Users        },
  { key: "view_invoices",    label: "Voir les factures",      shortLabel: "Factures",      icon: FileText     },
  { key: "make_sales",       label: "Effectuer des ventes",   shortLabel: "Ventes",        icon: ShoppingCart },
  { key: "view_reports",     label: "Voir les rapports",      shortLabel: "Rapports",      icon: BarChart2    },
  { key: "view_barcodes",    label: "Voir les codes-barres",  shortLabel: "Codes-barres",  icon: QrCode       },
  { key: "manage_suppliers", label: "Gérer les fournisseurs", shortLabel: "Fournisseurs",  icon: Truck        },
  { key: "manage_settings",  label: "Gérer les paramètres",   shortLabel: "Paramètres",    icon: Settings     },
  { key: "manage_users",     label: "Gérer les utilisateurs", shortLabel: "Utilisateurs",  icon: UserCog      },
];

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Vendeur standard",
    permissions: ["make_sales", "view_invoices", "manage_clients"],
  },
  {
    label: "Vendeur étendu",
    permissions: [
      "make_sales",
      "view_invoices",
      "manage_clients",
      "manage_products",
      "manage_stock",
    ],
  },
  {
    label: "Accès complet",
    permissions: PERMISSIONS.filter((p) => p.key !== "manage_users").map((p) => p.key),
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

/** Local permission state: userId → Set of permissions */
type DraftState = Record<number, Set<Permission>>;

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Row component ────────────────────────────────────────────────────────────

interface UserRowProps {
  user: UserListItem;
  draft: Set<Permission>;
  isModified: boolean;
  onToggle: (userId: number, perm: Permission, checked: boolean) => void;
  onApplyPreset: (userId: number, preset: Permission[]) => void;
}

function UserRow({ user, draft, isModified, onToggle, onApplyPreset }: UserRowProps) {
  const isAdmin = user.profile.role === "admin";
  const displayName = user.full_name || user.username;
  const initials = getInitials(displayName);

  return (
    <tr
      className={cn(
        "group transition-colors",
        isModified && "bg-primary/[0.03]"
      )}
    >
      {/* User cell */}
      <td className="sticky left-0 z-10 bg-card group-hover:bg-secondary/50 transition-colors border-r border-border">
        <div className="flex items-center gap-3 px-4 py-3 min-w-[200px]">
          {/* Avatar */}
          <span
            className="flex items-center justify-center w-9 h-9 rounded-full text-[11px] font-bold text-white shrink-0"
            style={{ background: isAdmin ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)" }}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
              {isModified && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "hsl(var(--primary))" }}
                  title="Modifications non sauvegardées"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  isAdmin
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isAdmin ? "Admin" : "Vendeur"}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Permission checkboxes */}
      {PERMISSIONS.map((perm) => {
        const checked = isAdmin || draft.has(perm.key);
        return (
          <td key={perm.key} className="text-center px-2 py-3">
            {isAdmin ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center justify-center">
                    <Checkbox
                      checked={true}
                      disabled
                      className="opacity-40 cursor-not-allowed"
                      aria-label={`${perm.label} — admin`}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Les admins ont tous les accès
                </TooltipContent>
              </Tooltip>
            ) : (
              <Checkbox
                checked={checked}
                onCheckedChange={(val) => onToggle(user.id, perm.key, !!val)}
                aria-label={perm.label}
              />
            )}
          </td>
        );
      })}

      {/* Preset actions */}
      <td className="px-3 py-3 text-right">
        {isAdmin ? (
          <span className="text-[11px] text-muted-foreground/50 pr-1">—</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Préset
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.label}
                  onSelect={() => onApplyPreset(user.id, preset.permissions)}
                  className="text-xs"
                >
                  {preset.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i}>
          <td className="sticky left-0 z-10 bg-card border-r border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </td>
          {PERMISSIONS.map((p) => (
            <td key={p.key} className="text-center px-2 py-3">
              <Skeleton className="w-4 h-4 rounded mx-auto" />
            </td>
          ))}
          <td className="px-3 py-3">
            <Skeleton className="h-7 w-16 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // ── All hooks declared before any conditional return ──────────────────────
  const [draft, setDraft] = useState<DraftState>({});
  const [savedState, setSavedState] = useState<DraftState>({});
  const [roleFilter, setRoleFilter] = useState<"all" | "vendeur">("all");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: userService.getAll,
  });

  const saveOneMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: Permission[] }) =>
      userService.setPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des permissions.");
    },
  });

  const saveBulkMutation = useMutation({
    mutationFn: async (entries: { id: number; permissions: Permission[] }[]) => {
      await Promise.all(entries.map((e) => userService.setPermissions(e.id, e.permissions)));
    },
    onSuccess: () => {
      toast.success("Toutes les permissions ont été sauvegardées.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Erreur lors de la sauvegarde en masse.");
    },
  });

  // Initialise draft from fetched data
  useEffect(() => {
    if (!data?.results) return;
    const initial: DraftState = {};
    for (const user of data.results) {
      if (user.profile.role !== "admin") {
        initial[user.id] = new Set((user.permissions ?? []) as Permission[]);
      }
    }
    setDraft(initial);
    setSavedState(initial);
  }, [data]);

  // ── Handlers — declared before any conditional return (Rules of Hooks) ────

  const handleToggle = useCallback(
    (userId: number, perm: Permission, checked: boolean) => {
      setDraft((prev) => {
        const current = new Set(prev[userId] ?? []);
        if (checked) {
          current.add(perm);
        } else {
          current.delete(perm);
        }
        return { ...prev, [userId]: current };
      });

      // Debounced auto-save per user (500 ms)
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDraft((latestDraft) => {
          const perms = [...(latestDraft[userId] ?? [])] as Permission[];
          saveOneMutation.mutate(
            { id: userId, permissions: perms },
            {
              onSuccess: () => {
                setSavedState((prev) => ({
                  ...prev,
                  [userId]: new Set(perms),
                }));
                toast.success("Permissions mises à jour.");
              },
            }
          );
          return latestDraft;
        });
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleApplyPreset = useCallback(
    (userId: number, permissions: Permission[]) => {
      const newSet = new Set(permissions);
      setDraft((prev) => ({ ...prev, [userId]: newSet }));
    },
    []
  );

  // ── Guard — after all hooks ────────────────────────────────────────────────

  if (currentUser?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const users: UserListItem[] = data?.results ?? [];

  // Compute modified user IDs
  const modifiedIds = new Set<number>();
  for (const [idStr, perms] of Object.entries(draft)) {
    const id = Number(idStr);
    const saved = savedState[id];
    if (!saved) continue;
    const changed =
      perms.size !== saved.size ||
      [...perms].some((p) => !saved.has(p));
    if (changed) modifiedIds.add(id);
  }

  const pendingCount = modifiedIds.size;

  // Filter users — only active users (both Django User and profile must be active)
  const filteredUsers = users.filter((u) => {
    if (!u.is_active || !u.profile.is_active) return false;
    if (roleFilter === "vendeur" && u.profile.role !== "vendeur") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (u.full_name || u.username).toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const handleSaveAll = () => {
    if (pendingCount === 0) return;
    const entries = [...modifiedIds].map((id) => ({
      id,
      permissions: [...(draft[id] ?? [])] as Permission[],
    }));
    saveBulkMutation.mutate(entries, {
      onSuccess: () => {
        setSavedState((prev) => {
          const next = { ...prev };
          for (const { id, permissions } of entries) {
            next[id] = new Set(permissions);
          }
          return next;
        });
      },
    });
  };

  return (
    <>
      <Topbar
        title="Gestion des permissions"
        subtitle="Attribuez les accès par utilisateur"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in space-y-6">

        {/* ── Page header ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground font-heading tracking-tight">
              Permissions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Matrice des accès par utilisateur — modifications sauvegardées automatiquement
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-medium border-primary/40 text-primary bg-primary/5"
              >
                {pendingCount} modification{pendingCount > 1 ? "s" : ""} non sauvegardée{pendingCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={pendingCount === 0 || saveBulkMutation.isPending}
              size="sm"
              className="gap-1.5"
            >
              {saveBulkMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Enregistrer tout
            </Button>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Role filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/40">
            {(["all", "vendeur"] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRoleFilter(val)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  roleFilter === val
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {val === "all" ? "Tous les rôles" : "Vendeurs uniquement"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Rechercher un utilisateur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* ── Matrix table ────────────────────────────────────────────── */}
        <div
          className="rounded-lg border bg-card overflow-hidden"
          style={{ boxShadow: "var(--shadow-sm, 0 1px 3px hsl(var(--shadow-color-warm, 0 0% 0%) / 0.08))" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-sm">
              {/* Header */}
              <thead>
                <tr
                  style={{
                    background: "hsl(var(--muted) / 0.6)",
                    borderBottom: "1px solid hsl(var(--border))",
                  }}
                >
                  {/* User column header */}
                  <th className="sticky left-0 z-20 bg-muted/60 border-r border-border px-4 py-3 text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      Utilisateur
                    </div>
                  </th>

                  {/* Permission columns */}
                  {PERMISSIONS.map((perm) => {
                    const Icon = perm.icon;
                    return (
                      <th key={perm.key} className="px-2 py-3 text-center min-w-[72px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-1 cursor-default">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center"
                                style={{ background: "hsl(var(--primary) / 0.1)" }}
                              >
                                <Icon
                                  className="w-3.5 h-3.5"
                                  style={{ color: "hsl(var(--primary))" }}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none max-w-[64px] text-center">
                                {perm.shortLabel}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {perm.label}
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    );
                  })}

                  {/* Actions column */}
                  <th className="px-3 py-3 text-right min-w-[100px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Présets
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <TableSkeleton />
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={PERMISSIONS.length + 2}
                      className="text-center py-12 text-muted-foreground text-sm"
                    >
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      draft={draft[user.id] ?? new Set()}
                      isModified={modifiedIds.has(user.id)}
                      onToggle={handleToggle}
                      onApplyPreset={handleApplyPreset}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          {!isLoading && filteredUsers.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-4 px-4 py-3 text-[11px] text-muted-foreground"
              style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}
            >
              <div className="flex items-center gap-1.5">
                <Checkbox checked disabled className="opacity-40 w-3.5 h-3.5" />
                <span>Case grisée = admin (accès immuable)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(var(--primary))" }}
                />
                <span>Point bleu = modification non sauvegardée</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Sauvegarde automatique après 500 ms d&apos;inactivité ou via &laquo; Enregistrer tout &raquo;</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
