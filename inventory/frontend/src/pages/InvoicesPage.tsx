import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { Eye, Printer, Download, Package, FileText, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { useTableManager } from "@/hooks/useTableManager";
import { invoiceService } from "@/services/invoiceService";
import type { Invoice } from "@/services/invoiceService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "paid" | "partial" | "unpaid" | "cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFCFA(amount: number | string): string {
  return Number(amount).toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR");
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Invoice["status"], string> = {
  paid: "Payée",
  partial: "Partielle",
  unpaid: "Impayée",
  cancelled: "Annulée",
};

const STATUS_VARIANTS: Record<
  Invoice["status"],
  "success" | "warning" | "danger" | "default"
> = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
  cancelled: "default",
};

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées" },
  { value: "partial", label: "Partielles" },
  { value: "unpaid", label: "Impayées" },
  { value: "cancelled", label: "Annulées" },
];

// ─── Invoice detail (modal content) ──────────────────────────────────────────

interface InvoiceDetailProps {
  invoice: Invoice;
  onClose: () => void;
}

function InvoiceDetail({ invoice, onClose }: InvoiceDetailProps) {
  const balanceDue = Number(invoice.balance_due);
  const amountPaid = Number(invoice.amount_paid);
  const totalAmount = Number(invoice.total_amount);
  const changeGiven = amountPaid - totalAmount;

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
            <p className="font-mono font-semibold text-base">{invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground">{formatDate(invoice.issued_at)}</p>
            <div className="mt-1">
              <StatusBadge
                label={STATUS_LABELS[invoice.status]}
                variant={STATUS_VARIANTS[invoice.status]}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Client */}
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Client</p>
          <p className="font-medium">{invoice.client_name ?? "Client comptoir"}</p>
        </div>

        <Separator />

        {/* Items table */}
        {invoice.items && invoice.items.length > 0 ? (
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
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{item.product_name}</td>
                  <td className="py-2 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-2 text-right text-muted-foreground">{formatFCFA(item.unit_price)}</td>
                  <td className="py-2 text-right font-medium">{formatFCFA(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun article</p>
        )}

        <Separator />

        {/* Totals */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>{formatFCFA(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Somme payée</span>
            <span>{formatFCFA(amountPaid)}</span>
          </div>
          {changeGiven > 0 && (
            <div className="flex justify-between text-success font-medium">
              <span>Monnaie rendue</span>
              <span>{formatFCFA(changeGiven)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex justify-between text-warning font-medium">
              <span>Reste à payer</span>
              <span>{formatFCFA(balanceDue)}</span>
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

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: () =>
      invoiceService.getAll(
        statusFilter !== "all" ? { status: statusFilter } : undefined
      ),
  });

  const invoices = data?.results ?? [];

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
  } = useTableManager(invoices as unknown as Record<string, unknown>[], {
    initialPageSize: 10,
    searchKeys: ["invoice_number", "client_name"] as never[],
  });

  const typedPaginated = paginated as unknown as Invoice[];

  // Count badges for filter tabs
  const allInvoices = data?.results ?? [];
  const countByStatus = (status: Invoice["status"]) =>
    allInvoices.filter((inv) => inv.status === status).length;

  // Total général (sur l'ensemble filtré actuel)
  const grandTotal = invoices.reduce(
    (acc, inv) => acc + Number(inv.total_amount || 0),
    0
  );

  return (
    <>
      <Topbar title="Factures" subtitle="Historique des factures générées" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* ── Premium Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/15">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
                <span className="inline-flex items-center h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold">
                  {allInvoices.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Historique des factures générées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-shadow"
              onClick={() => { window.location.href = "/pos"; }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* ── Filtres : search + statut — ligne horizontale ─────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <PageHeader
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Rechercher par numéro ou client..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-muted/40 rounded-lg p-1 w-fit shrink-0">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                {f.value !== "all" && !isLoading && (
                  <span className="ml-1.5 text-[11px] opacity-60 font-mono">
                    {countByStatus(f.value as Invoice["status"])}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Chargement des factures…
          </div>
        )}

        {/* Desktop : tableau normal */}
        {!isLoading && (
          <>
            <div className="hidden md:block bg-card rounded-xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° Facture</th>
                      <SortableHeader label="Date" sortKey="issued_at" currentSort={sort} onSort={toggleSort} />
                      <th>Client</th>
                      <th className="text-center">Articles</th>
                      <SortableHeader label="Total" sortKey="total_amount" currentSort={sort} onSort={toggleSort} />
                      <th>Statut</th>
                      <th className="w-24 text-right pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typedPaginated.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="w-8 h-8 opacity-40" />
                            <p className="text-sm">Aucune facture trouvée.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {typedPaginated.map((inv) => (
                      <tr key={inv.id} className="group">
                        <td className="font-mono text-xs text-muted-foreground tracking-tight">
                          {inv.invoice_number}
                        </td>
                        <td className="text-sm tabular-nums">{formatDate(inv.issued_at)}</td>
                        <td className="font-medium text-sm">
                          {inv.client_name ?? (
                            <span className="text-muted-foreground italic font-normal">Client comptoir</span>
                          )}
                        </td>
                        <td className="text-center text-sm tabular-nums text-muted-foreground">
                          {inv.items?.length ?? 0}
                        </td>
                        <td>
                          <span className="font-mono font-bold text-primary tabular-nums">
                            {formatFCFA(inv.total_amount)}
                          </span>
                        </td>
                        <td>
                          <StatusBadge
                            label={STATUS_LABELS[inv.status]}
                            variant={STATUS_VARIANTS[inv.status]}
                          />
                        </td>
                        <td className="pr-4">
                          <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                              title="Voir la facture"
                              onClick={() => setViewingInvoice(inv)}
                            >
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button
                              className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                              title="Imprimer"
                              onClick={() => {
                                setViewingInvoice(inv);
                                setTimeout(() => window.print(), 300);
                              }}
                            >
                              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {typedPaginated.length > 0 && (
                    <tfoot>
                      <tr className="bg-muted/30 border-t-2 border-primary/20">
                        <td colSpan={4} className="text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground py-3">
                          Total général
                        </td>
                        <td className="py-3">
                          <span className="font-mono font-bold text-lg text-primary tabular-nums">
                            {formatFCFA(grandTotal)}
                          </span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Mobile : card list — md:hidden */}
            <div className="md:hidden space-y-2.5">
              {typedPaginated.length === 0 && (
                <div className="bg-card border rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Aucune facture trouvée.</p>
                </div>
              )}
              {typedPaginated.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  {/* Header row : numéro + statut */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] text-muted-foreground truncate tracking-tight">
                        {inv.invoice_number}
                      </p>
                      <p className="text-sm font-semibold mt-0.5 truncate">
                        {inv.client_name ?? (
                          <span className="text-muted-foreground italic font-normal">Client comptoir</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {formatDate(inv.issued_at)}
                        <span className="mx-1.5 opacity-40">·</span>
                        {inv.items?.length ?? 0} article
                        {(inv.items?.length ?? 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <StatusBadge
                      label={STATUS_LABELS[inv.status]}
                      variant={STATUS_VARIANTS[inv.status]}
                    />
                  </div>

                  {/* Footer row : total + actions */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Total
                      </span>
                      <span className="font-mono font-bold text-lg text-primary tabular-nums leading-tight">
                        {formatFCFA(inv.total_amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="p-2 rounded-md hover:bg-primary/10 transition-colors"
                        title="Voir la facture"
                        onClick={() => setViewingInvoice(inv)}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-2 rounded-md hover:bg-primary/10 transition-colors"
                        title="Imprimer"
                        onClick={() => {
                          setViewingInvoice(inv);
                          setTimeout(() => window.print(), 300);
                        }}
                      >
                        <Printer className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
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
          </>
        )}
      </div>

      {/* ── Modal : Voir facture ── */}
      <Dialog
        open={!!viewingInvoice}
        onOpenChange={(open) => {
          if (!open) setViewingInvoice(null);
        }}
      >
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
