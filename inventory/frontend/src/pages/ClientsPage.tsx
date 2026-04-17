import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
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
import { Plus, Phone, Mail, Edit, Trash2, History, Users, UserPlus, FileSpreadsheet } from "lucide-react";
import { exportClients } from "@/lib/exportClients";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";
import type { Client } from "@/services/clientService";
import type { Sale } from "@/services/salesService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ClientCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-4 bg-muted rounded w-24" />
        </div>
        <div className="space-y-1 items-end flex flex-col">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── Purchase history modal content ──────────────────────────────────────────

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
          <DialogTitle>Historique — {client?.name}</DialogTitle>
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
              <div key={sale.id} className="rounded-md border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{formatDate(sale.created_at)}</span>
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
                <p className="font-semibold text-sm">{formatFcfa(sale.total_amount)}</p>
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  // ── Fetch clients ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () =>
      clientService.getAll(search ? { search } : undefined),
  });

  const clients: Client[] = data?.results ?? [];

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDeletingClient(null);
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

        {/* ── Premium Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/15">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
                <span className="inline-flex items-center h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold">
                  {clients.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestion de la base clients
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportClients(clients)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exporter Excel
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm hover:shadow-md hover:brightness-105 transition-all"
              onClick={() => navigate("/clients/new")}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Nouveau client
            </Button>
          </div>
        </div>

        {/* ── Search bar ─────────────────────────────────────────── */}
        <div className="mb-5">
          <SearchInput
            placeholder="Rechercher un client par nom, téléphone ou email..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <ClientCardSkeleton key={i} />)}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            message="Aucun client trouvé."
            icon={<Users className="w-10 h-10" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="group bg-card rounded-xl border p-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-200"
              >
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all"
                    style={{
                      background: "hsl(var(--primary) / 0.12)",
                      color: "hsl(var(--primary))",
                    }}
                  >
                    {initials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{client.name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {client.purchases_count} achat{client.purchases_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Voir historique"
                      onClick={() => setHistoryClient(client)}
                    >
                      <History className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Modifier"
                      onClick={() => navigate(`/clients/${client.id}/edit`)}
                    >
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                      title="Supprimer"
                      onClick={() => setDeletingClient(client)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 text-xs">
                  {client.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono tabular-nums">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                </div>

                {/* Footer stats */}
                <div className="flex items-end justify-between mt-3 pt-3 border-t gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Total achats
                    </p>
                    <p className="font-mono font-bold text-primary text-sm tabular-nums leading-tight mt-0.5">
                      {formatFcfa(client.total_purchases)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Depuis
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {formatDate(client.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal : Historique des achats ── */}
      <HistoryModal
        client={historyClient}
        onClose={() => setHistoryClient(null)}
      />

      {/* ── AlertDialog : Supprimer client ── */}
      <AlertDialog
        open={!!deletingClient}
        onOpenChange={(open) => { if (!open) setDeletingClient(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer{" "}
              <strong>{deletingClient?.name}</strong>.
              Cette action est irréversible.
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
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
