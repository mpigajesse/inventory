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
  Shield,
  Search,
  Loader2,
  Info,
  Check,
  ChevronDown,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Topbar } from "@/components/layout/Topbar";
import { userService, type UserListItem } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import type { Permission } from "@/hooks/usePermissions";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/roleLabel";

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
    label: "Vendeur·se standard",
    permissions: ["make_sales", "view_invoices", "manage_clients"],
  },
  {
    label: "Vendeur·se étendu·e",
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

const NUM_COLS = PERMISSIONS.length;

interface UserRowProps {
  user: UserListItem;
  draft: Set<Permission>;
  isModified: boolean;
  rowIndex: number;
  onToggle: (userId: number, perm: Permission) => void;
  onApplyPreset: (userId: number, preset: Permission[]) => void;
}

function UserRow({ user, draft, isModified, rowIndex, onToggle, onApplyPreset }: UserRowProps) {
  const isAdmin = user.profile.role === "admin";
  const displayName = user.full_name || user.username;
  const initials = getInitials(displayName);
  const isEven = rowIndex % 2 === 0;
  const [pressingKey, setPressingKey] = useState<string | null>(null);

  function handleToggleWithFeedback(userId: number, perm: Permission) {
    setPressingKey(perm);
    setTimeout(() => setPressingKey(null), 150);
    onToggle(userId, perm);
  }

  return (
    <tr
      className="group"
      style={{
        background: isEven ? "transparent" : "hsl(22 72% 48% / 0.015)",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "hsl(22 72% 48% / 0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isEven
          ? "transparent"
          : "hsl(22 72% 48% / 0.015)";
      }}
    >
      {/* User info — sticky */}
      <td
        className="sticky left-0 z-10 px-4 py-3"
        style={{
          background: "hsl(var(--card))",
          borderBottom: "1px solid hsl(var(--border) / 0.6)",
          borderRight: "1px solid hsl(var(--border) / 0.4)",
          minWidth: "220px",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{
              background: isAdmin
                ? "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))"
                : "linear-gradient(135deg, hsl(210 70% 52%), hsl(220 80% 60%))",
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
              {isModified && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "hsl(22 72% 48%)" }}
                  title="Modifications non sauvegardées"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={
                  isAdmin
                    ? {
                        background: "hsl(22 72% 48% / 0.12)",
                        color: "hsl(22 72% 40%)",
                      }
                    : {
                        background: "hsl(var(--muted))",
                        color: "hsl(var(--muted-foreground))",
                      }
                }
              >
                {getRoleLabel(user.profile.role, user.profile.genre)}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Permission toggles */}
      {PERMISSIONS.map((perm, colIndex) => {
        const isChecked = isAdmin || draft.has(perm.key);
        const isPressing = pressingKey === perm.key;
        const staggerDelay = (rowIndex * NUM_COLS + colIndex) * 25;
        return (
          <td
            key={perm.key}
            className="text-center px-2 py-3"
            style={{
              borderBottom: "1px solid hsl(var(--border) / 0.6)",
              background: isAdmin ? "hsl(22 72% 48% / 0.04)" : undefined,
              opacity: 0,
              animation: "permFadeIn 0.2s ease forwards",
              animationDelay: `${staggerDelay}ms`,
            }}
          >
            <div className="flex justify-center">
              {isAdmin ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center justify-center cursor-not-allowed"
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "8px",
                        background: "hsl(22 72% 48% / 0.35)",
                        border: "1px solid hsl(22 72% 48% / 0.35)",
                      }}
                      aria-label={`${perm.label} — admin`}
                    >
                      <Check className="w-3 h-3 text-white" style={{ opacity: 0.8 }} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Les admins ont tous les accès
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => handleToggleWithFeedback(user.id, perm.key)}
                  className="flex items-center justify-center focus:outline-none focus-visible:ring-2"
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "8px",
                    background: isChecked ? "hsl(22 72% 48%)" : "hsl(var(--muted))",
                    border: isChecked
                      ? "1px solid hsl(22 72% 48%)"
                      : "1px solid hsl(var(--border))",
                    boxShadow: isChecked
                      ? "0 2px 6px hsl(22 72% 48% / 0.35)"
                      : "none",
                    transform: isPressing ? "scale(0.9)" : "scale(1)",
                    transition: "transform 0.1s ease, background 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsl(22 72% 48% / 0.12)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked) {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))";
                    }
                  }}
                  aria-label={perm.label}
                  aria-pressed={isChecked}
                >
                  {isChecked && <Check className="w-3 h-3 text-white" />}
                </button>
              )}
            </div>
          </td>
        );
      })}

      {/* Preset dropdown */}
      <td
        className="px-3 py-3 text-right"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}
      >
        {isAdmin ? (
          <span className="text-[11px] text-muted-foreground/40 pr-1">—</span>
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
            <DropdownMenuContent align="end" className="w-48">
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
          <td
            className="sticky left-0 z-10 px-4 py-3"
            style={{
              background: "hsl(var(--card))",
              borderBottom: "1px solid hsl(var(--border) / 0.6)",
              borderRight: "1px solid hsl(var(--border) / 0.4)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </td>
          {PERMISSIONS.map((p) => (
            <td
              key={p.key}
              className="text-center px-2 py-3"
              style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}
            >
              <Skeleton className="w-5 h-5 rounded-md mx-auto" />
            </td>
          ))}
          <td
            className="px-3 py-3"
            style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}
          >
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
        initial[user.id] = new Set((user.profile.permissions ?? []) as Permission[]);
      }
    }
    setDraft(initial);
    setSavedState(initial);
  }, [data]);

  // ── Handlers — declared before any conditional return (Rules of Hooks) ────

  const handleToggle = useCallback(
    (userId: number, perm: Permission) => {
      setDraft((prev) => {
        const current = new Set(prev[userId] ?? []);
        if (current.has(perm)) {
          current.delete(perm);
        } else {
          current.add(perm);
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
      <style>{`
        @keyframes permFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <Topbar
        title="Gestion des permissions"
        subtitle="Attribuez les accès par utilisateur"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in space-y-5">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full flex-shrink-0"
              style={{
                background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
              }}
            />
            <h1
              className="text-2xl font-extrabold font-heading"
              style={{ letterSpacing: "-0.025em" }}
            >
              Matrice des permissions
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-3">
            Gérez les droits d&apos;accès de chaque vendeur individuellement
          </p>
        </div>

        {/* ── Info card ───────────────────────────────────────────────── */}
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{
            background: "hsl(210 70% 52% / 0.06)",
            border: "1px solid hsl(210 70% 52% / 0.2)",
          }}
        >
          <Info
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: "hsl(210 70% 52%)" }}
          />
          <p className="text-sm text-foreground leading-relaxed">
            Les <strong>admins</strong> ont tous les droits par défaut. Seuls les{" "}
            <strong>vendeurs·ses</strong> apparaissent dans cette matrice.
            Les modifications sont enregistrées automatiquement après 500 ms.
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Role filter pills */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg"
            style={{
              background: "hsl(var(--muted) / 0.5)",
              border: "1px solid hsl(var(--border))",
            }}
          >
            {(["all", "vendeur"] as const).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setRoleFilter(val)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  roleFilter === val
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={
                  roleFilter === val
                    ? { border: "1px solid hsl(var(--border))" }
                    : { border: "1px solid transparent" }
                }
              >
                {val === "all" ? "Tous les rôles" : "Vendeurs uniquement"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher un utilisateur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Pending badge — pushed right */}
          {pendingCount > 0 && (
            <div className="sm:ml-auto flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "hsl(22 72% 48% / 0.1)",
                  color: "hsl(22 72% 40%)",
                  border: "1px solid hsl(22 72% 48% / 0.25)",
                }}
              >
                {pendingCount} modification{pendingCount > 1 ? "s" : ""} en attente
              </span>
            </div>
          )}
        </div>

        {/* ── Matrix table ─────────────────────────────────────────────── */}
        <div
          className="overflow-x-auto rounded-2xl"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>

            {/* Header */}
            <thead>
              <tr>
                {/* User column */}
                <th
                  className="sticky left-0 z-20 px-4 py-3 text-left"
                  style={{
                    background: "hsl(30 15% 95%)",
                    borderBottom: "1px solid hsl(var(--border))",
                    borderRight: "1px solid hsl(var(--border) / 0.4)",
                    minWidth: "220px",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                    style={{ fontWeight: 700 }}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Utilisateur
                  </div>
                </th>

                {/* Permission columns */}
                {PERMISSIONS.map((perm, colIndex) => {
                  const Icon = perm.icon;
                  return (
                    <th
                      key={perm.key}
                      className="px-2 py-3 text-center"
                      style={{
                        background: "hsl(22 72% 48% / 0.06)",
                        borderBottom: "1px solid hsl(var(--border))",
                        minWidth: "76px",
                        opacity: 0,
                        animation: "permFadeIn 0.25s ease forwards",
                        animationDelay: `${colIndex * 60}ms`,
                      }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-1.5 cursor-default">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center"
                              style={{ background: "hsl(22 72% 48% / 0.1)" }}
                            >
                              <Icon
                                className="w-3.5 h-3.5"
                                style={{ color: "hsl(22 72% 48% / 0.6)" }}
                              />
                            </div>
                            <span
                              className="font-semibold text-muted-foreground leading-tight text-center uppercase"
                              style={{ maxWidth: "68px", fontSize: "9px", letterSpacing: "0.05em" }}
                            >
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

                {/* Presets column */}
                <th
                  className="px-3 py-3 text-right"
                  style={{
                    background: "hsl(var(--muted))",
                    borderBottom: "1px solid hsl(var(--border))",
                    minWidth: "110px",
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Présets
                  </span>
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={PERMISSIONS.length + 2}
                    className="text-center py-14 text-muted-foreground text-sm"
                  >
                    <Shield className="w-9 h-9 mx-auto mb-3 opacity-15" />
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    draft={draft[user.id] ?? new Set()}
                    isModified={modifiedIds.has(user.id)}
                    rowIndex={idx}
                    onToggle={handleToggle}
                    onApplyPreset={handleApplyPreset}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Legend ──────────────────────────────────────────────────── */}
        {!isLoading && filteredUsers.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl text-[11px] text-muted-foreground"
            style={{
              background: "hsl(var(--muted) / 0.4)",
              border: "1px solid hsl(var(--border) / 0.5)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-sm flex items-center justify-center"
                style={{
                  background: "hsl(22 72% 48%)",
                  boxShadow: "0 2px 6px hsl(22 72% 48% / 0.3)",
                }}
              >
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
              <span>Case cuivre = permission activée</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-sm"
                style={{
                  background: "hsl(22 72% 48% / 0.35)",
                }}
              />
              <span>Case atténuée = admin (accès immuable)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "hsl(22 72% 48%)" }}
              />
              <span>Point cuivre = modification non sauvegardée</span>
            </div>
          </div>
        )}

        {/* ── Bulk save bar (slides up from bottom) ───────────────────── */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            padding: "0 1rem 1rem",
            transform: pendingCount > 0 ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s ease",
            pointerEvents: pendingCount > 0 ? "auto" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid hsl(var(--border))",
              borderTop: "2px solid hsl(22 72% 48% / 0.4)",
              borderRadius: "14px",
              padding: "0.75rem 1.25rem",
              boxShadow: "0 8px 32px hsl(22 30% 15% / 0.18)",
            }}
          >
            <span
              className="text-xs font-semibold"
              style={{ color: "hsl(22 72% 40%)" }}
            >
              {pendingCount} modification{pendingCount > 1 ? "s" : ""} en attente
            </span>
            <button
              onClick={handleSaveAll}
              disabled={saveBulkMutation.isPending}
              className="flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1.25rem",
                fontWeight: "600",
                fontSize: "0.8125rem",
                cursor: "pointer",
                transition: "opacity 0.2s ease",
              }}
            >
              {saveBulkMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Enregistrer tout
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
