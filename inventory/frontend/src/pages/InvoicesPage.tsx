import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Printer, Download, Package } from "lucide-react";
import { useState } from "react";
import { useTableManager } from "@/hooks/useTableManager";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  date: string;
  client: string;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  paid: boolean;
}

type StatusFilter = "all" | "paid" | "unpaid";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_INVOICES: Invoice[] = [
  {
    id: "FAC-2026-001",
    date: "14/04/2026",
    client: "Client comptoir",
    paid: true,
    totalAmount: 45000,
    paidAmount: 45000,
    items: [
      { name: "Riz 25kg", qty: 2, unitPrice: 12500 },
      { name: "Huile 5L", qty: 1, unitPrice: 8000 },
      { name: "Sucre 5kg", qty: 2, unitPrice: 6000 },
    ],
  },
  {
    id: "FAC-2026-002",
    date: "14/04/2026",
    client: "Jean Mouloungui",
    paid: true,
    totalAmount: 12500,
    paidAmount: 12500,
    items: [
      { name: "Farine 10kg", qty: 1, unitPrice: 12500 },
    ],
  },
  {
    id: "FAC-2026-003",
    date: "13/04/2026",
    client: "Client comptoir",
    paid: true,
    totalAmount: 78000,
    paidAmount: 78000,
    items: [
      { name: "Riz 25kg", qty: 3, unitPrice: 12500 },
      { name: "Huile 5L", qty: 2, unitPrice: 8000 },
      { name: "Sucre 5kg", qty: 4, unitPrice: 6000 },
      { name: "Sel 1kg", qty: 5, unitPrice: 600 },
      { name: "Savon", qty: 10, unitPrice: 800 },
    ],
  },
  {
    id: "FAC-2026-004",
    date: "13/04/2026",
    client: "Marie Obiang",
    paid: false,
    totalAmount: 23000,
    paidAmount: 0,
    items: [
      { name: "Lessive 2kg", qty: 2, unitPrice: 4500 },
      { name: "Savon ×5", qty: 1, unitPrice: 4000 },
      { name: "Huile 5L", qty: 1, unitPrice: 8000 },
    ],
  },
  {
    id: "FAC-2026-005",
    date: "12/04/2026",
    client: "Client comptoir",
    paid: true,
    totalAmount: 56500,
    paidAmount: 60000,
    items: [
      { name: "Riz 25kg", qty: 2, unitPrice: 12500 },
      { name: "Farine 10kg", qty: 2, unitPrice: 12500 },
      { name: "Sucre 5kg", qty: 1, unitPrice: 6000 },
      { name: "Sel 1kg", qty: 5, unitPrice: 600 },
    ],
  },
  {
    id: "FAC-2026-006",
    date: "12/04/2026",
    client: "Paul Ndong",
    paid: true,
    totalAmount: 92000,
    paidAmount: 92000,
    items: [
      { name: "Riz 25kg", qty: 5, unitPrice: 12500 },
      { name: "Huile 5L", qty: 4, unitPrice: 8000 },
      { name: "Farine 10kg", qty: 1, unitPrice: 12500 },
    ],
  },
  {
    id: "FAC-2026-007",
    date: "11/04/2026",
    client: "Client comptoir",
    paid: true,
    totalAmount: 18000,
    paidAmount: 20000,
    items: [
      { name: "Sucre 5kg", qty: 2, unitPrice: 6000 },
      { name: "Sel 1kg", qty: 10, unitPrice: 600 },
    ],
  },
  {
    id: "FAC-2026-008",
    date: "11/04/2026",
    client: "Client comptoir",
    paid: false,
    totalAmount: 8000,
    paidAmount: 0,
    items: [
      { name: "Huile 5L", qty: 1, unitPrice: 8000 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFCFA(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées" },
  { value: "unpaid", label: "Impayées" },
];

// ─── Invoice detail (modal content) ──────────────────────────────────────────

interface InvoiceDetailProps {
  invoice: Invoice;
  onClose: () => void;
}

function InvoiceDetail({ invoice, onClose }: InvoiceDetailProps) {
  const rendu = invoice.paidAmount - invoice.totalAmount;

  return (
    <>
      <div className="space-y-5 text-sm">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">Naoservices</p>
              <p className="text-xs text-muted-foreground">INVENTORY</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold text-base">{invoice.id}</p>
            <p className="text-xs text-muted-foreground">{invoice.date}</p>
            <div className="mt-1">
              <StatusBadge
                label={invoice.paid ? "Payée" : "Impayée"}
                variant={invoice.paid ? "success" : "warning"}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Client */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Client</p>
          <p className="font-medium">{invoice.client}</p>
        </div>

        <Separator />

        {/* Items table */}
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left font-medium text-muted-foreground pb-2">Article</th>
              <th className="text-center font-medium text-muted-foreground pb-2 w-12">Qté</th>
              <th className="text-right font-medium text-muted-foreground pb-2 w-28">Prix unit.</th>
              <th className="text-right font-medium text-muted-foreground pb-2 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-2">{item.name}</td>
                <td className="py-2 text-center text-muted-foreground">{item.qty}</td>
                <td className="py-2 text-right text-muted-foreground">{formatFCFA(item.unitPrice)}</td>
                <td className="py-2 text-right font-medium">{formatFCFA(item.qty * item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Separator />

        {/* Totals */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{formatFCFA(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Somme payée</span>
            <span>{formatFCFA(invoice.paidAmount)}</span>
          </div>
          {rendu > 0 && (
            <div className="flex justify-between text-success font-medium">
              <span>Monnaie rendue</span>
              <span>{formatFCFA(rendu)}</span>
            </div>
          )}
          {!invoice.paid && (
            <div className="flex justify-between text-warning font-medium">
              <span>Reste à payer</span>
              <span>{formatFCFA(invoice.totalAmount - invoice.paidAmount)}</span>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onClose}>Fermer</Button>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Pré-filtre par statut avant le hook
  const statusFiltered = MOCK_INVOICES.filter(inv => {
    if (statusFilter === "paid") return inv.paid;
    if (statusFilter === "unpaid") return !inv.paid;
    return true;
  });

  const {
    paginated,
    search,
    setSearch,
    sort,
    toggleSort,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    rangeStart,
    rangeEnd,
  } = useTableManager(statusFiltered as unknown as Record<string, unknown>[], {
    initialPageSize: 10,
    searchKeys: ["id", "client"] as never[],
  });

  const typedPaginated = paginated as unknown as Invoice[];

  return (
    <>
      <Topbar title="Factures" subtitle="Historique des factures générées" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* Toolbar */}
        <PageHeader
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher une facture..."
          action={
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          }
        />

        {/* Onglets filtre statut */}
        <div className="flex items-center gap-1 mb-4 bg-muted/40 rounded-lg p-1 w-fit">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({MOCK_INVOICES.filter(inv =>
                    f.value === "paid" ? inv.paid : !inv.paid
                  ).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Desktop : tableau normal */}
        <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <SortableHeader label="Date" sortKey="date" currentSort={sort} onSort={toggleSort} />
                  <th>Client</th>
                  <th>Articles</th>
                  <SortableHeader label="Total" sortKey="totalAmount" currentSort={sort} onSort={toggleSort} />
                  <th>Statut</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {typedPaginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune facture trouvée.
                    </td>
                  </tr>
                )}
                {typedPaginated.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-medium font-mono text-xs">{inv.id}</td>
                    <td>{inv.date}</td>
                    <td>{inv.client}</td>
                    <td>{inv.items.length}</td>
                    <td className="font-medium">{formatFCFA(inv.totalAmount)}</td>
                    <td>
                      <StatusBadge
                        label={inv.paid ? "Payée" : "Impayée"}
                        variant={inv.paid ? "success" : "warning"}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title="Voir la facture"
                          onClick={() => setViewingInvoice(inv)}
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title="Imprimer"
                          onClick={() => { setViewingInvoice(inv); setTimeout(() => window.print(), 300); }}
                        >
                          <Printer className="w-3.5 h-3.5 text-muted-foreground" />
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
              Aucune facture trouvée.
            </div>
          )}
          {typedPaginated.map((inv) => (
            <div key={inv.id} className="bg-card border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-xs text-foreground">{inv.id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inv.client}</p>
                </div>
                <StatusBadge
                  label={inv.paid ? "Payée" : "Impayée"}
                  variant={inv.paid ? "success" : "warning"}
                />
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-2">
                <span>Date : <strong className="text-foreground">{inv.date}</strong></span>
                <span>Articles : <strong className="text-foreground">{inv.items.length}</strong></span>
                <span className="col-span-2">Total : <strong className="text-foreground">{formatFCFA(inv.totalAmount)}</strong></span>
              </div>
              <div className="flex gap-1 justify-end">
                <button
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  title="Voir la facture"
                  onClick={() => setViewingInvoice(inv)}
                >
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                  title="Imprimer"
                  onClick={() => { setViewingInvoice(inv); setTimeout(() => window.print(), 300); }}
                >
                  <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ── Modal : Voir facture ── */}
      <Dialog open={!!viewingInvoice} onOpenChange={open => { if (!open) setViewingInvoice(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la facture</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <InvoiceDetail
              invoice={viewingInvoice}
              onClose={() => setViewingInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
