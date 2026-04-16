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
import { Eye, Printer, Download, Package } from "lucide-react";
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
        <div className="flex flex-wrap items-center gap-1 mb-4 bg-muted/40 rounded-lg p-1 w-fit">
          {STATUS_FILTERS.map((f) => (
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
              {f.value !== "all" && !isLoading && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({countByStatus(f.value as Invoice["status"])})
                </span>
              )}
            </button>
          ))}
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
            <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° Facture</th>
                      <SortableHeader label="Date" sortKey="issued_at" currentSort={sort} onSort={toggleSort} />
                      <th>Client</th>
                      <th>Articles</th>
                      <SortableHeader label="Total" sortKey="total_amount" currentSort={sort} onSort={toggleSort} />
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
                        <td className="font-medium font-mono text-xs">{inv.invoice_number}</td>
                        <td>{formatDate(inv.issued_at)}</td>
                        <td>{inv.client_name ?? "Client comptoir"}</td>
                        <td>{inv.items?.length ?? 0}</td>
                        <td className="font-medium">{formatFCFA(inv.total_amount)}</td>
                        <td>
                          <StatusBadge
                            label={STATUS_LABELS[inv.status]}
                            variant={STATUS_VARIANTS[inv.status]}
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
                      <p className="font-mono font-semibold text-xs text-foreground">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.client_name ?? "Client comptoir"}
                      </p>
                    </div>
                    <StatusBadge
                      label={STATUS_LABELS[inv.status]}
                      variant={STATUS_VARIANTS[inv.status]}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mb-2">
                    <span>Date : <strong className="text-foreground">{formatDate(inv.issued_at)}</strong></span>
                    <span>Articles : <strong className="text-foreground">{inv.items?.length ?? 0}</strong></span>
                    <span className="col-span-2">
                      Total : <strong className="text-foreground">{formatFCFA(inv.total_amount)}</strong>
                    </span>
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
                      onClick={() => {
                        setViewingInvoice(inv);
                        setTimeout(() => window.print(), 300);
                      }}
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
