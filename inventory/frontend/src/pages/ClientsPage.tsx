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
} from "lucide-react";
import { exportClients } from "@/lib/exportClients";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
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
          <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {client && (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: `linear-gradient(135deg, ${TERRACOTTA}, ${TERRACOTTA_LIGHT})` }}
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
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // ── Fetch clients ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientService.getAll(search ? { search } : undefined),
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
      const message =
        error instanceof Error ? error.message : "Impossible d'archiver ce client. Réessayez.";
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
                  className="h-9"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exporter Excel
                </Button>
              )}
              {can("manage_clients") && (
                <button
                  onClick={() => navigate("/clients/new")}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${TERRACOTTA}, ${TERRACOTTA_LIGHT})`,
                    boxShadow: `0 4px 14px hsl(22 72% 48% / 0.35)`,
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Nouveau client
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <div className="mb-5">
          <SearchInput
            placeholder="Rechercher un client par nom, téléphone ou email..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {!isLoading && clients.length === 0 ? (
          <EmptyState
            message="Aucun client trouvé."
            icon={<Users className="w-10 h-10" />}
          />
        ) : (
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider"
                  style={{ background: "hsl(22 72% 48% / 0.04)" }}
                >
                  <th className="px-4 py-3 text-left text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left text-muted-foreground hidden md:table-cell">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground">Total achats</th>
                  <th className="px-4 py-3 text-left text-muted-foreground hidden lg:table-cell">
                    Crédit dû
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground hidden sm:table-cell">
                    Depuis
                  </th>
                  <th className="px-4 py-3 text-right text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [1, 2, 3, 4, 5, 6].map((i) => <TableRowSkeleton key={i} />)
                  : clients.map((client) => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        canManage={can("manage_clients")}
                        onHistory={() => setHistoryClient(client)}
                        onEdit={() => navigate(`/clients/${client.id}/edit`)}
                        onDelete={() => setDeletingClient(client)}
                      />
                    ))}
              </tbody>
            </table>
          </div>
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
  canManage: boolean;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientRow({ client, canManage, onHistory, onEdit, onDelete }: ClientRowProps) {
  const [hovered, setHovered] = useState(false);

  const creditBalance = client.credit_balance ?? 0;

  return (
    <tr
      className="group border-b border-border/60 transition-colors"
      style={{ background: hovered ? "hsl(22 72% 48% / 0.03)" : "transparent" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Nom + Avatar */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))`,
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
            color: "hsl(22 72% 48%)",
          }}
        >
          {formatFcfa(client.total_purchases)}
        </span>
      </td>

      {/* Solde crédit */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        {creditBalance > 0 ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "hsl(4 72% 52% / 0.1)",
              color: "hsl(4 72% 52%)",
            }}
          >
            ↑ {creditBalance.toLocaleString("fr-FR")} FCFA dû
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

      {/* Actions (visibles au hover) */}
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
