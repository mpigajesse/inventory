import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Plus,
  Edit2,
  Trash2,
  History,
  Users,
  UserPlus,
  FileSpreadsheet,
  Loader2,
  Eye,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { exportClients } from "@/lib/exportClients";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import type { Client } from "@/services/clientService";
import { toast } from "sonner";
import type { Sale } from "@/services/salesService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Design tokens ────────────────────────────────────────────────────────────

const TERRACOTTA = "hsl(22 72% 48%)";
const TERRACOTTA_LIGHT = "hsl(36 88% 52%)";
const FOREST = "hsl(152 38% 38%)";
const DANGER = "hsl(4 72% 52%)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFcfa(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

function initials(name: string): string {
  if (!name || name.trim() === "") return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? "")
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Loading skeleton (table rows) ───────────────────────────────────────────

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/60 animate-pulse">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted shrink-0" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="h-3.5 bg-muted rounded w-28" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 bg-muted rounded w-28" />
      </td>
      <td className="px-4 py-3.5 hidden lg:table-cell">
        <div className="h-5 bg-muted rounded-full w-24" />
      </td>
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <div className="h-3 bg-muted rounded w-20" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 bg-muted rounded w-16" />
      </td>
    </tr>
  );
}

// ─── Client card (mobile view < md) ──────────────────────────────────────────

interface ClientCardProps {
  client: Client;
  index: number;
  canManage: boolean;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientCard({ client, index, canManage, onHistory, onEdit, onDelete }: ClientCardProps) {
  const creditBalance = client.credit_balance ?? 0;

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-4"
      style={{
        animation: "slideInUp 0.3s ease forwards",
        animationDelay: `${index * 45}ms`,
        opacity: 0,
      }}
    >
      {/* Ligne 1 : avatar + nom + actions */}
      <div className="flex items-center gap-3">
        <div
          className="rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{
            width: "40px",
            height: "40px",
            background: `linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))`,
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          }}
        >
          {initials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{client.name}</p>
          <p className="text-xs text-muted-foreground">
            {client.purchases_count} achat{client.purchases_count !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Actions toujours visibles sur mobile */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="p-2 rounded-lg bg-muted/60 active:bg-muted transition-colors"
            title="Historique d'achats"
            onClick={onHistory}
          >
            <History className="w-4 h-4 text-muted-foreground" />
          </button>
          {canManage && (
            <button
              className="p-2 rounded-lg bg-muted/60 active:bg-muted transition-colors"
              title="Modifier"
              onClick={onEdit}
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {canManage && (
            <button
              className="p-2 rounded-lg bg-destructive/10 active:bg-destructive/20 transition-colors"
              title="Archiver"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 text-destructive/70" />
            </button>
          )}
        </div>
      </div>

      {/* Ligne 2 : téléphone */}
      {client.phone && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3 shrink-0" />
          <a href={`tel:${client.phone}`} className="font-mono tabular-nums">
            {client.phone}
          </a>
        </div>
      )}

      {/* Ligne 3 : solde + crédit */}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/40">
        <span
          className="font-bold text-sm tabular-nums"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatFcfa(client.total_purchases)}
        </span>
        {creditBalance > 0 && (
          <span
            className="inline-flex items-center gap-1 text-xs font-bold"
            style={{
              borderRadius: "100px",
              padding: "4px 10px",
              background: "hsl(38 85% 50% / 0.13)",
              color: "hsl(38 70% 32%)",
              border: "1px solid hsl(38 85% 50% / 0.3)",
            }}
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            {creditBalance.toLocaleString("fr-FR")} FCFA
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Purchase history modal ───────────────────────────────────────────────────

interface HistoryModalProps {
  client: Client | null;
  onClose: () => void;
}

function HistoryModal({ client, onClose }: HistoryModalProps) {
  const { data: purchases = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["client-purchases", client?.id],
    queryFn: () => clientService.getPurchases(client!.id),
    enabled: client !== null,
  });

  return (
    <Dialog open={client !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {client && (
              <div
                className="rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${TERRACOTTA}, ${TERRACOTTA_LIGHT})`,
                  boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                }}
              >
                {initials(client.name)}
              </div>
            )}
            <DialogTitle>Historique — {client?.name}</DialogTitle>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun achat enregistré.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {purchases.map((sale) => (
              <div key={sale.id} className="rounded-xl border border-border/60 p-3 text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{formatDate(sale.created_at)}</span>
                  <StatusBadge
                    label={sale.amount_paid >= sale.total_amount ? "Payé" : "Impayé"}
                    variant={sale.amount_paid >= sale.total_amount ? "success" : "warning"}
                  />
                </div>
                {sale.invoice_number && (
                  <p className="text-muted-foreground text-xs">
                    Facture {sale.invoice_number}
                  </p>
                )}
                <p
                  className="font-bold text-sm"
                  style={{ fontFamily: "Fraunces, Georgia, serif", color: TERRACOTTA }}
                >
                  {formatFcfa(sale.total_amount)}
                </p>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/vendeur") ? "/vendeur" : "";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // Debounce : évite une requête API à chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch clients ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["clients", debouncedSearch],
    queryFn: () => clientService.getAll(debouncedSearch ? { search: debouncedSearch } : undefined),
  });

  const clients: Client[] = data?.results ?? [];
  const totalClients = data?.count ?? clients.length;
  const clientsWithCredit = clients.filter((c) => (c.credit_balance ?? 0) > 0).length;

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientService.delete(id),
    onSuccess: () => {
      toast.success("Client archivé", {
        description: `${deletingClient?.name ?? "Le client"} a été archivé avec succès.`,
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeletingClient(null);
    },
    onError: (error: unknown) => {
      // Extraire le message Django depuis la réponse Axios (ex: 409 avec des factures)
      let message = "Impossible d'archiver ce client. Réessayez.";
      if (
        error !== null &&
        typeof error === "object" &&
        "response" in error
      ) {
        const axiosError = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
        message =
          axiosError.response?.data?.detail ??
          axiosError.response?.data?.message ??
          axiosError.message ??
          message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error("Erreur lors de l'archivage", { description: message });
    },
  });

  function handleDelete() {
    if (!deletingClient) return;
    deleteMutation.mutate(deletingClient.id);
  }

  return (
    <>
      <Topbar title="Clients" subtitle="Gestion de la base clients" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* ── Premium Header ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-1 h-6 rounded-full shrink-0"
                  style={{ background: `linear-gradient(to bottom, ${TERRACOTTA}, ${TERRACOTTA_LIGHT})` }}
                />
                <h1
                  className="text-2xl font-extrabold"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Clients
                </h1>
              </div>
              <p className="text-sm text-muted-foreground ml-3">
                {isLoading ? (
                  <span className="inline-block w-40 h-3.5 bg-muted rounded animate-pulse" />
                ) : (
                  <>
                    {totalClients} client{totalClients !== 1 ? "s" : ""}
                    {clientsWithCredit > 0 && (
                      <> · <span style={{ color: DANGER }}>{clientsWithCredit} avec crédit</span></>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {can("manage_clients") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportClients(clients)}
                  className="h-9 hidden sm:inline-flex"
                >
                  <FileSpreadsheet className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Exporter Excel</span>
                </Button>
              )}
              {can("manage_clients") && (
                <button
                  onClick={() => navigate(`${basePath}/clients/new`)}
                  className="inline-flex items-center gap-2 h-9 px-3 sm:px-4 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${TERRACOTTA}, ${TERRACOTTA_LIGHT})`,
                    boxShadow: `0 4px 14px hsl(22 72% 48% / 0.35)`,
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden xs:inline sm:inline">Nouveau client</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div
          className="mb-5"
          style={{
            padding: "16px",
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            border: "1px solid hsl(var(--border))",
            transition: "opacity 0.2s ease",
          }}
        >
          <SearchInput
            placeholder="Rechercher un client par nom, téléphone ou email..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* ── Table (desktop md+) / Cards (mobile) ────────────────────────── */}
        {!isLoading && clients.length === 0 ? (
          <EmptyState
            message="Aucun client trouvé."
            icon={<Users className="w-10 h-10" />}
          />
        ) : (
          <>
            {/* ── Vue cards — mobile uniquement (< md) ─────────────────────── */}
            <div className="md:hidden space-y-3">
              {isLoading
                ? [1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-border/60 bg-card p-4 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-full bg-muted shrink-0" style={{ width: 40, height: 40 }} />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-muted rounded w-32" />
                          <div className="h-3 bg-muted rounded w-20" />
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded w-28 mb-2" />
                      <div className="h-5 bg-muted rounded w-36" />
                    </div>
                  ))
                : clients.map((client, index) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      index={index}
                      canManage={can("manage_clients")}
                      onHistory={() => setHistoryClient(client)}
                      onEdit={() => navigate(`${basePath}/clients/${client.id}/edit`)}
                      onDelete={() => setDeletingClient(client)}
                    />
                  ))}
            </div>

            {/* ── Vue tableau — md et plus ──────────────────────────────────── */}
            <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b border-border/60"
                    style={{ background: "hsl(30 15% 95%)" }}
                  >
                    <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Client</th>
                    <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Total achats</th>
                    <th className="px-4 py-3 text-left text-muted-foreground hidden lg:table-cell" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Crédit dû
                    </th>
                    <th className="px-4 py-3 text-left text-muted-foreground hidden xl:table-cell" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Depuis
                    </th>
                    <th className="px-4 py-3 text-right text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Actions</th>
                  </tr>
                </thead>
                <tbody key={search}>
                  {isLoading
                    ? [1, 2, 3, 4, 5, 6].map((i) => <TableRowSkeleton key={i} />)
                    : clients.map((client, index) => (
                        <ClientRow
                          key={client.id}
                          client={client}
                          index={index}
                          canManage={can("manage_clients")}
                          onHistory={() => setHistoryClient(client)}
                          onEdit={() => navigate(`${basePath}/clients/${client.id}/edit`)}
                          onDelete={() => setDeletingClient(client)}
                        />
                      ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Modal : Historique des achats ── */}
      <HistoryModal
        client={historyClient}
        onClose={() => setHistoryClient(null)}
      />

      {/* ── AlertDialog : Archiver client ── */}
      <AlertDialog
        open={!!deletingClient}
        onOpenChange={(open) => { if (!open) setDeletingClient(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingClient?.name}</strong> sera archivé et n'apparaîtra plus dans
              les listes.{" "}
              <span className="block mt-1 text-muted-foreground">
                Le client sera archivé (soft delete) — ses données et historique d'achats
                sont conservés.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archivage…
                </>
              ) : (
                "Archiver"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Table row component ──────────────────────────────────────────────────────

interface ClientRowProps {
  client: Client;
  index: number;
  canManage: boolean;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientRow({ client, index, canManage, onHistory, onEdit, onDelete }: ClientRowProps) {
  const [hovered, setHovered] = useState(false);

  const creditBalance = client.credit_balance ?? 0;

  return (
    <tr
      className="group border-b border-border/60 transition-colors"
      style={{
        background: hovered ? "hsl(22 72% 48% / 0.03)" : "transparent",
        animation: "slideInUp 0.3s ease forwards",
        animationDelay: `${index * 45}ms`,
        opacity: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Nom + Avatar */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              transform: hovered ? "scale(1.08)" : "scale(1)",
              boxShadow: hovered
                ? "0 4px 8px rgba(0,0,0,0.15), 0 2px 6px hsl(22 72% 48% / 0.35)"
                : "0 2px 4px rgba(0,0,0,0.08)",
            }}
          >
            {initials(client.name)}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight">{client.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {client.purchases_count} achat{client.purchases_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="space-y-1">
          {client.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="font-mono tabular-nums">{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[160px]">{client.email}</span>
            </div>
          )}
          {!client.phone && !client.email && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>

      {/* Total achats en Fraunces */}
      <td className="px-4 py-3.5">
        <span
          className="font-bold text-sm tabular-nums"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatFcfa(client.total_purchases)}
        </span>
      </td>

      {/* Solde crédit */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        {creditBalance > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold overflow-hidden"
            style={{
              borderRadius: "100px",
              padding: "6px 12px",
              background: "hsl(38 85% 50% / 0.13)",
              color: "hsl(38 70% 32%)",
              border: "1px solid hsl(38 85% 50% / 0.3)",
            }}
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span
              className="inline-block"
              style={{
                transformOrigin: "left",
                animation: `scaleInX 0.5s ease-out forwards`,
                animationDelay: `${index * 45 + 120}ms`,
                transform: "scaleX(0)",
              }}
            >
              {creditBalance.toLocaleString("fr-FR")} FCFA dû
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Date d'entrée */}
      <td className="px-4 py-3.5 hidden sm:table-cell">
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDate(client.created_at)}
        </span>
      </td>

      {/* Actions — toujours visibles (hover sur desktop, permanent sur tactile) */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Historique d'achats"
            onClick={onHistory}
          >
            <History className="w-4 h-4 text-muted-foreground" />
          </button>
          {canManage && (
            <button
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Modifier"
              onClick={onEdit}
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {canManage && (
            <button
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
              title="Archiver"
              onClick={onDelete}
            >
              <Trash2 className="w-4 h-4 text-destructive/70" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
