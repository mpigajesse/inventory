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
import { Plus, Phone, Mail, Edit, Trash2, History, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  purchases: number;
  total: string;
  lastPurchase: string;
}

interface MockPurchase {
  date: string;
  articles: string;
  total: string;
  paid: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_CLIENTS: Client[] = [
  { id: 1, name: "Jean Mouloungui", phone: "+241 07 12 34 56", email: "jean@email.com", notes: "", purchases: 15, total: "234 000 FCFA", lastPurchase: "14/04/2026" },
  { id: 2, name: "Marie Obiang", phone: "+241 06 78 90 12", email: "", notes: "Cliente régulière", purchases: 8, total: "156 000 FCFA", lastPurchase: "13/04/2026" },
  { id: 3, name: "Paul Ndong", phone: "+241 07 45 67 89", email: "paul.n@email.com", notes: "", purchases: 23, total: "412 000 FCFA", lastPurchase: "12/04/2026" },
  { id: 4, name: "Sophie Mintsa", phone: "+241 06 23 45 67", email: "", notes: "", purchases: 5, total: "67 000 FCFA", lastPurchase: "10/04/2026" },
  { id: 5, name: "André Nzé", phone: "+241 07 89 01 23", email: "andre.nze@email.com", notes: "Gros client", purchases: 31, total: "580 000 FCFA", lastPurchase: "14/04/2026" },
];

const MOCK_PURCHASES: Record<number, MockPurchase[]> = {
  1: [
    { date: "14/04/2026", articles: "Riz 25kg × 2, Huile 5L × 1", total: "34 000 FCFA", paid: true },
    { date: "10/04/2026", articles: "Sucre 5kg × 3", total: "18 000 FCFA", paid: true },
    { date: "05/04/2026", articles: "Farine 10kg × 2, Sel 1kg × 5", total: "27 500 FCFA", paid: false },
  ],
  2: [
    { date: "13/04/2026", articles: "Savon × 10, Lessive 2kg × 2", total: "22 000 FCFA", paid: true },
    { date: "07/04/2026", articles: "Huile 5L × 3", total: "36 000 FCFA", paid: true },
  ],
  3: [
    { date: "12/04/2026", articles: "Riz 25kg × 5", total: "75 000 FCFA", paid: true },
    { date: "09/04/2026", articles: "Farine 10kg × 4, Sucre 5kg × 2", total: "48 000 FCFA", paid: true },
    { date: "03/04/2026", articles: "Huile 5L × 6, Sel 1kg × 10", total: "81 000 FCFA", paid: false },
  ],
  4: [
    { date: "10/04/2026", articles: "Savon × 5", total: "7 500 FCFA", paid: true },
  ],
  5: [
    { date: "14/04/2026", articles: "Riz 25kg × 10, Huile 5L × 5", total: "168 000 FCFA", paid: true },
    { date: "11/04/2026", articles: "Farine 10kg × 8", total: "96 000 FCFA", paid: true },
    { date: "06/04/2026", articles: "Sucre 5kg × 10, Sel 1kg × 20", total: "82 000 FCFA", paid: true },
  ],
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [search, setSearch] = useState("");

  // Only modals kept here: history and delete confirmation
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  function handleDelete() {
    if (!deletingClient) return;
    setClients(prev => prev.filter(c => c.id !== deletingClient.id));
    setDeletingClient(null);
  }

  const purchases = historyClient ? (MOCK_PURCHASES[historyClient.id] ?? []) : [];

  return (
    <>
      <Topbar title="Clients" subtitle="Gestion de la base clients" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <SearchInput
            placeholder="Rechercher un client..."
            value={search}
            onChange={setSearch}
          />
          <Button className="shrink-0 sm:ml-auto" onClick={() => navigate("/clients/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </Button>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <EmptyState
            message="Aucun client trouvé."
            icon={<Users className="w-10 h-10" />}
          />
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="bg-card rounded-lg border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {client.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.purchases} achat{client.purchases !== 1 ? "s" : ""}</p>
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title="Voir historique"
                    onClick={() => setHistoryClient(client)}
                  >
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title="Modifier"
                    onClick={() => navigate(`/clients/${client.id}/edit`)}
                  >
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                    title="Supprimer"
                    onClick={() => setDeletingClient(client)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Total achats</p>
                  <p className="text-sm font-semibold">{client.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Dernier achat</p>
                  <p className="text-sm">{client.lastPurchase}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* ── Modal : Historique des achats ── */}
      <Dialog open={!!historyClient} onOpenChange={open => { if (!open) setHistoryClient(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Historique — {historyClient?.name}</DialogTitle>
          </DialogHeader>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun achat enregistré.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {purchases.map((p, i) => (
                <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.date}</span>
                    <StatusBadge label={p.paid ? "Payé" : "Impayé"} variant={p.paid ? "success" : "warning"} />
                  </div>
                  <p className="text-muted-foreground text-xs">{p.articles}</p>
                  <p className="font-semibold text-sm">{p.total}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryClient(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog : Supprimer client ── */}
      <AlertDialog open={!!deletingClient} onOpenChange={open => { if (!open) setDeletingClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer <strong>{deletingClient?.name}</strong>.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
