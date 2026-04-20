import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { Eye, Printer, FileSpreadsheet, Package, FileText, Plus, Banknote, Smartphone, CreditCard, Copy, User, Barcode, Download } from "lucide-react";
import { toast } from "sonner";
import React, { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useTableManager } from "@/hooks/useTableManager";
import { invoiceService } from "@/services/invoiceService";
import type { Invoice } from "@/services/invoiceService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { exportInvoicesToExcel } from "@/lib/exportInvoices";
import { usePermissions } from "@/hooks/usePermissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "paid" | "partial" | "unpaid" | "cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFCFA(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (isNaN(n)) return "0 FCFA";
  return n.toLocaleString("fr-FR") + " FCFA";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Dates ISO de type "YYYY-MM-DD" (sans heure) : parser manuellement pour
  // éviter le décalage UTC→local (Gabon = UTC+1).
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = dateOnly
    ? new Date(`${iso}T00:00:00`)
    : new Date(iso);
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

// ─── Payment method helpers ───────────────────────────────────────────────────

function getPaymentLabel(method: string | undefined): React.ReactNode {
  const iconClass = "w-3.5 h-3.5 inline-block align-middle mr-1";
  switch (method) {
    case "cash":
      return <><Banknote className={iconClass} />Espèces</>;
    case "mobile_money":
      return <><Smartphone className={iconClass} />Mobile</>;
    case "card":
      return <><CreditCard className={iconClass} />Carte</>;
    default:
      return <><FileText className={iconClass} />Crédit</>;
  }
}

function getPaymentStyle(method: string | undefined): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "100px",
    padding: "6px 12px",
    fontWeight: 600,
    fontSize: "11px",
    letterSpacing: "0.02em",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    border: "1px solid transparent",
  };
  switch (method) {
    case "cash":
      return {
        ...base,
        background: "hsl(152 38% 38% / 0.14)",
        color: "hsl(152 45% 32%)",
        border: "1px solid hsl(152 38% 38% / 0.25)",
      };
    case "mobile_money":
      return {
        ...base,
        background: "hsl(210 70% 52% / 0.12)",
        color: "hsl(210 72% 38%)",
        border: "1px solid hsl(210 70% 52% / 0.25)",
      };
    case "card":
      return {
        ...base,
        background: "hsl(270 60% 52% / 0.12)",
        color: "hsl(270 55% 42%)",
        border: "1px solid hsl(270 60% 52% / 0.25)",
      };
    default:
      return {
        ...base,
        background: "hsl(38 85% 50% / 0.12)",
        color: "hsl(38 70% 36%)",
        border: "1px solid hsl(38 85% 50% / 0.25)",
      };
  }
}

// ─── Client avatar initiales ──────────────────────────────────────────────────

function ClientAvatar({ name }: { name: string | null | undefined }) {
  const initial = (name || "C")[0].toUpperCase();
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
      style={{ background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))" }}
    >
      {initial}
    </div>
  );
}

// ─── Composant d'impression isolé (rendu dans un div caché) ──────────────────

interface PrintableInvoiceProps {
  invoice: Invoice;
}

function PrintableInvoice({ invoice }: PrintableInvoiceProps) {
  const balanceDue = Number(invoice.balance_due);
  const amountPaid = Number(invoice.amount_paid);
  const totalAmount = Number(invoice.total_amount);
  const changeGiven = amountPaid - totalAmount;

  const statusLabels: Record<Invoice["status"], string> = {
    paid: "PAYÉE",
    partial: "PARTIELLE",
    unpaid: "IMPAYÉE",
    cancelled: "ANNULÉE",
  };

  const statusColors: Record<Invoice["status"], string> = {
    paid: "#16a34a",
    partial: "#d97706",
    unpaid: "#dc2626",
    cancelled: "#6b7280",
  };

  const statusBg: Record<Invoice["status"], string> = {
    paid: "#dcfce7",
    partial: "#fef3c7",
    unpaid: "#fee2e2",
    cancelled: "#f3f4f6",
  };

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111", fontSize: 13, padding: "0 8px" }}>
      {/* En-tête entreprise */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "2px solid #111", paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            NAOSERVICES INVENTORY
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
            MPJ HIGH-TECH · Partenaire technologique
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>
            Libreville, Gabon — +241 07 40 13 02
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: 1 }}>
            Facture
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
            {invoice.invoice_number}
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
            Date : {formatDate(invoice.issued_at)}
          </div>
        </div>
      </div>

      {/* Statut paiement */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{
          display: "inline-block",
          padding: "6px 16px",
          border: `2px solid ${statusColors[invoice.status]}`,
          borderRadius: 6,
          backgroundColor: statusBg[invoice.status],
          color: statusColors[invoice.status],
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}>
          {statusLabels[invoice.status]}
        </div>
      </div>

      {/* Bloc client */}
      <div style={{ marginBottom: 24, padding: "12px 16px", backgroundColor: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 4 }}>
          Client
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {invoice.client_name ?? "Client comptoir"}
        </div>
      </div>

      {/* Tableau articles */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr style={{ backgroundColor: "#111", color: "#fff" }}>
            <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Désignation
            </th>
            <th style={{ textAlign: "center", padding: "8px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, width: 60 }}>
              Qté
            </th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, width: 130 }}>
              Prix unit.
            </th>
            <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, width: 130 }}>
              Total ligne
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, idx) => (
              <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                <td style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>
                  <div>{item.product_name}</div>
                  {item.barcode && (
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: "#6b7280", marginTop: 2 }}>
                      {item.barcode}
                    </div>
                  )}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: "1px solid #e5e7eb", color: "#444" }}>
                  {item.quantity}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #e5e7eb", color: "#444", fontFamily: "monospace" }}>
                  {formatFCFA(item.unit_price)}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontFamily: "monospace" }}>
                  {formatFCFA(item.subtotal)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ padding: "12px 10px", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>
                Aucun article
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totaux */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ width: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#555" }}>
            <span>Somme payée</span>
            <span style={{ fontFamily: "monospace" }}>{formatFCFA(amountPaid)}</span>
          </div>
          {changeGiven > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#16a34a" }}>
              <span>Monnaie rendue</span>
              <span style={{ fontFamily: "monospace" }}>{formatFCFA(changeGiven)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#d97706" }}>
              <span>Reste à payer</span>
              <span style={{ fontFamily: "monospace" }}>{formatFCFA(balanceDue)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid #111", marginTop: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 15, textTransform: "uppercase", letterSpacing: 0.5 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>{formatFCFA(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, marginTop: 8, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Merci pour votre confiance — NAOSERVICES · MPJ HIGH-TECH
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
          Monnaie : FCFA — Document généré le {new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
    </div>
  );
}

// ─── PDF download ─────────────────────────────────────────────────────────────

// Verrou global pour éviter le déclenchement simultané de plusieurs exports PDF
let _pdfDownloading = false;

async function downloadInvoicePDF(invoice: Invoice): Promise<void> {
  if (_pdfDownloading) return;
  _pdfDownloading = true;
  try {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;

  const totalAmount = isNaN(Number(invoice.total_amount)) ? 0 : Number(invoice.total_amount);
  const amountPaid = isNaN(Number(invoice.amount_paid)) ? 0 : Number(invoice.amount_paid);
  const balanceDue = isNaN(Number(invoice.balance_due)) ? 0 : Number(invoice.balance_due);
  const changeGiven = amountPaid - totalAmount;

  const fmt = (n: number | string | null | undefined) => {
    const v = Number(n);
    return (isNaN(v) ? 0 : v).toLocaleString("fr-FR") + " FCFA";
  };
  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
    const d = dateOnly ? new Date(`${iso}T00:00:00`) : new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR");
  };

  let y = 15;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("NAOSERVICES INVENTORY", marginL, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  y += 5;
  doc.text("MPJ HIGH-TECH · Partenaire technologique", marginL, y);
  y += 4;
  doc.text("Libreville, Gabon — +241 07 40 13 02", marginL, y);

  // Invoice number block (top-right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("FACTURE", pageW - marginR, 15, { align: "right" });

  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(invoice.invoice_number ?? "—", pageW - marginR, 21, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date : ${fmtDate(invoice.issued_at)}`, pageW - marginR, 27, { align: "right" });

  y += 6;
  // Divider
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Client block ─────────────────────────────────────────────────────────────
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentW, 16, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text("CLIENT", marginL + 4, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(invoice.client_name ?? "Client comptoir", marginL + 4, y + 11);
  y += 22;

  // ── Items table ───────────────────────────────────────────────────────────────
  const colX = {
    designation: marginL,
    qty: marginL + contentW * 0.55,
    unitPrice: marginL + contentW * 0.70,
    total: marginL + contentW,
  };

  // Table header
  doc.setFillColor(20, 20, 20);
  doc.rect(marginL, y, contentW, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DÉSIGNATION", colX.designation + 2, y + 5.2);
  doc.text("QTÉ", colX.qty, y + 5.2, { align: "center" });
  doc.text("PRIX UNIT.", colX.unitPrice + (colX.total - colX.unitPrice) / 2 - 10, y + 5.2, { align: "center" });
  doc.text("TOTAL", colX.total - 2, y + 5.2, { align: "right" });
  y += 8;

  const items = invoice.items ?? [];
  items.forEach((item, idx) => {
    const rowH = item.barcode ? 11 : 8;
    if (idx % 2 !== 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(marginL, y, contentW, rowH, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(item.product_name, colX.designation + 2, y + 5.5, {
      maxWidth: colX.qty - colX.designation - 4,
    });

    if (item.barcode) {
      doc.setFont("courier", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 114, 128);
      doc.text(item.barcode, colX.designation + 2, y + 9.5);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(String(item.quantity), colX.qty, y + 5.5, { align: "center" });

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(fmt(item.unit_price), colX.unitPrice + (colX.total - colX.unitPrice) / 2 - 10, y + 5.5, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(fmt(item.subtotal), colX.total - 2, y + 5.5, { align: "right" });

    // Row bottom border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginL, y + rowH, pageW - marginR, y + rowH);
    y += rowH;
  });

  if (items.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Aucun article", pageW / 2, y + 6, { align: "center" });
    y += 10;
  }

  y += 6;

  // ── Totals block ──────────────────────────────────────────────────────────────
  const totalsX = marginL + contentW * 0.55;
  const totalsW = contentW * 0.45;

  const addTotalRow = (
    label: string,
    value: string,
    bold: boolean,
    color: [number, number, number] = [80, 80, 80]
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(...color);
    doc.text(label, totalsX + 2, y + 5);
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(value, totalsX + totalsW - 2, y + 5, { align: "right" });
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(totalsX, y + 7, totalsX + totalsW, y + 7);
    y += 8;
  };

  addTotalRow("Somme payée", fmt(amountPaid), false);
  if (changeGiven > 0) {
    addTotalRow("Monnaie rendue", fmt(changeGiven), false, [22, 163, 74]);
  }
  if (balanceDue > 0) {
    addTotalRow("Reste à payer", fmt(balanceDue), false, [217, 119, 6]);
  }

  // Total row with thick top border
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.line(totalsX, y, totalsX + totalsW, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("TOTAL", totalsX + 2, y);
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(fmt(totalAmount), totalsX + totalsW - 2, y, { align: "right" });
  y += 12;

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("Merci de votre visite", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(
    `© NAOSERVICES · MPJ HIGH-TECH — Document généré le ${new Date().toLocaleDateString("fr-FR")}`,
    pageW / 2,
    y,
    { align: "center" }
  );

  const dateSlug = fmtDate(invoice.issued_at).replace(/\//g, "-");
  const safeNumber = (invoice.invoice_number ?? "sans-numero").replace(/[^a-zA-Z0-9-_]/g, "_");
  doc.save(`facture-${safeNumber}-${dateSlug}.pdf`);
  } catch (err) {
    console.error("[PDF] Erreur lors de la génération :", err);
  } finally {
    _pdfDownloading = false;
  }
}

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

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Facture ${invoice.invoice_number ?? ""}`.trim(),
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  return (
    <>
      {/* Zone cachée dédiée à l'impression — non visible dans l'interface */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <PrintableInvoice invoice={invoice} />
        </div>
      </div>

      {/* ── Dialog content — animated entrance ── */}
      <div style={{ opacity: 0, animation: 'invoiceDetailIn 0.25s ease forwards' }}>

      {/* ── Dialog header premium ── */}
      <div
        className="-mx-6 -mt-2 mb-5 px-6 py-5 rounded-t-lg"
        style={{
          background: "linear-gradient(135deg, hsl(20 30% 7%), hsl(22 28% 12%))",
          boxShadow: "inset 0 -1px 0 hsl(22 72% 48% / 0.15)",
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(22 72% 48% / 0.3)", border: "1px solid hsl(22 72% 55% / 0.4)" }}
            >
              <Package className="w-5 h-5" style={{ color: "hsl(36 88% 70%)" }} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: "hsl(36 88% 88%)" }}>
                Naoservices
              </p>
              <p className="text-xs" style={{ color: "hsl(22 72% 65%)" }}>INVENTORY</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className="font-bold text-xl leading-tight font-editorial"
              style={{
                background: "linear-gradient(135deg, hsl(36 88% 82%), hsl(22 72% 65%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
              }}
            >
              {invoice.invoice_number}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(22 72% 65%)" }}>
              {formatDate(invoice.issued_at)}
            </p>
            <div className="mt-2">
              <StatusBadge
                label={STATUS_LABELS[invoice.status]}
                variant={STATUS_VARIANTS[invoice.status]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        {/* Client */}
        <div className="flex items-center gap-3">
          <ClientAvatar name={invoice.client_name} />
          <div>
            <p className="text-xs text-muted-foreground leading-none mb-1">Client</p>
            <p className="font-semibold text-sm">{invoice.client_name ?? "Client comptoir"}</p>
          </div>
          {invoice.payment_method && (
            <span
              className="ml-auto text-xs font-semibold"
              style={getPaymentStyle(invoice.payment_method)}
            >
              {getPaymentLabel(invoice.payment_method)}
            </span>
          )}
        </div>

        <Separator />

        {/* Items table */}
        {invoice.items && invoice.items.length > 0 ? (
          <table className="w-full text-xs" style={{ borderRadius: "8px", overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "hsl(30 15% 95%)" }}>
                <th
                  className="text-left pb-2 pt-2 pl-2 rounded-l"
                  style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.03em", color: "hsl(var(--muted-foreground))" }}
                >
                  Article
                </th>
                <th
                  className="text-center pb-2 pt-2 w-12"
                  style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.03em", color: "hsl(var(--muted-foreground))" }}
                >
                  Qté
                </th>
                <th
                  className="text-right pb-2 pt-2 w-28"
                  style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.03em", color: "hsl(var(--muted-foreground))" }}
                >
                  Prix unit.
                </th>
                <th
                  className="text-right pb-2 pt-2 pr-2 w-28 rounded-r"
                  style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.03em", color: "hsl(var(--muted-foreground))" }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr
                  key={item.id}
                  className="border-b last:border-0"
                  style={{ background: idx % 2 !== 0 ? "hsl(30 20% 98%)" : "transparent" }}
                >
                  <td className="py-2 pr-2 pl-2">
                    <span>{item.product_name}</span>
                    {item.barcode && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Barcode className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                        <span className="text-xs font-mono text-muted-foreground">{item.barcode}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-center text-muted-foreground">{item.quantity}</td>
                  <td className="py-2 text-right text-muted-foreground">{formatFCFA(item.unit_price)}</td>
                  <td className="py-2 pr-2 text-right font-semibold">{formatFCFA(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun article</p>
        )}

        <Separator />

        {/* Totals — section premium */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "hsl(22 72% 48% / 0.05)", border: "1px solid hsl(22 72% 48% / 0.15)" }}
        >
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>Somme payée</span>
            <span>{formatFCFA(amountPaid)}</span>
          </div>
          {changeGiven > 0 && (
            <div className="flex justify-between text-success text-sm font-medium">
              <span>Monnaie rendue</span>
              <span>{formatFCFA(changeGiven)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex justify-between text-warning text-sm font-medium">
              <span>Reste à payer</span>
              <span>{formatFCFA(balanceDue)}</span>
            </div>
          )}
          <div
            className="flex justify-between items-center pt-3 mt-1"
            style={{ borderTop: "1px solid hsl(22 72% 48% / 0.2)" }}
          >
            <span className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Total</span>
            <span
              className="font-bold text-2xl font-editorial"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {formatFCFA(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose}>Fermer</Button>
        <Button
          variant="outline"
          onClick={() => downloadInvoicePDF(invoice)}
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger PDF
        </Button>
        <Button
          onClick={() => handlePrint()}
          style={{ background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))", border: "none" }}
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimer
        </Button>
      </DialogFooter>

      </div>{/* end animated entrance wrapper */}
    </>
  );
}

// ─── Bouton d'impression inline (tableau et cartes mobiles) ──────────────────

interface InlinePrintButtonProps {
  invoice: Invoice;
  className?: string;
  iconSize?: string;
}

function InlinePrintButton({ invoice, className, iconSize = "w-3.5 h-3.5" }: InlinePrintButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Facture ${invoice.invoice_number ?? ""}`.trim(),
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  return (
    <>
      {/* Zone cachée dédiée à l'impression de cette facture */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <PrintableInvoice invoice={invoice} />
        </div>
      </div>
      <button
        className={className ?? "p-1.5 rounded-lg transition-colors hover:bg-muted"}
        title="Imprimer"
        onClick={() => handlePrint()}
      >
        <Printer className={`${iconSize} text-muted-foreground`} />
      </button>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { can } = usePermissions();
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
  // Quand un filtre de statut est actif, `data.results` ne contient que ce statut,
  // donc les compteurs des autres onglets seraient faux (0). On n'affiche le compteur
  // que pour l'onglet "all" (où tous les statuts sont présents).
  const allInvoices = data?.results ?? [];
  const countByStatus = (status: Invoice["status"]) =>
    statusFilter === "all"
      ? allInvoices.filter((inv) => inv.status === status).length
      : null;

  // Total général (sur l'ensemble filtré actuel)
  const grandTotal = invoices.reduce(
    (acc, inv) => acc + Number(inv.total_amount || 0),
    0
  );

  return (
    <>
      <Topbar title="Factures" subtitle="Historique des factures générées" onMenuClick={onMenuClick} />
      <div className="page-container animate-slide-in">

        {/* ── Page Header premium ─────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ background: "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))" }}
                />
                <h1
                  className="text-2xl font-extrabold font-heading"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Factures
                </h1>
                <span
                  className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-mono font-bold"
                  style={{
                    background: "hsl(22 72% 48% / 0.1)",
                    color: "hsl(22 72% 48%)",
                    border: "1px solid hsl(22 72% 48% / 0.2)",
                  }}
                >
                  {allInvoices.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground ml-3">
                {allInvoices.length} factures · Total :{" "}
                <span
                  className="font-editorial font-bold"
                  style={{ color: "hsl(22 72% 48%)" }}
                >
                  {grandTotal.toLocaleString("fr-FR")} FCFA
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {can("view_reports") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportInvoicesToExcel(invoices)}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exporter Excel
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => { window.location.href = "/pos"; }}
                style={{
                  background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  border: "none",
                  boxShadow: "0 2px 8px hsl(22 72% 48% / 0.35)",
                }}
                className="hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle facture
              </Button>
            </div>
          </div>
        </div>

        {/* ── Barre de filtres premium ─────────────────────────────────── */}
        <div
          className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-2xl mb-6"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 1px 4px hsl(0 0% 0% / 0.04)",
          }}
        >
          {/* Search */}
          <div className="flex-1 min-w-0">
            <SearchInput
              placeholder="Rechercher par numéro ou client..."
              value={search}
              onChange={setSearch}
            />
          </div>

          {/* Filtre statut — pills */}
          <div className="flex flex-wrap items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit shrink-0">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={
                  statusFilter === f.value
                    ? {
                        background: "hsl(22 72% 48%)",
                        color: "white",
                        boxShadow: "0 1px 4px hsl(22 72% 48% / 0.4)",
                      }
                    : {
                        color: "hsl(var(--muted-foreground))",
                      }
                }
              >
                {f.label}
                {f.value !== "all" && !isLoading && (() => {
                  const count = countByStatus(f.value as Invoice["status"]);
                  return count !== null ? (
                    <span className="ml-1.5 text-[11px] font-mono" style={{ opacity: statusFilter === f.value ? 0.8 : 0.6 }}>
                      {count}
                    </span>
                  ) : null;
                })()}
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

        {/* Desktop : tableau premium */}
        {!isLoading && (
          <>
            <div className="hidden md:block bg-card rounded-2xl border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "hsl(30 15% 95%)" }}>
                      <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        N° Facture
                      </th>
                      <SortableHeader
                        label="Date"
                        sortKey="issued_at"
                        currentSort={sort}
                        onSort={toggleSort}
                        className="px-4 py-3 text-left text-muted-foreground"
                        style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}
                      />
                      <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Client
                      </th>
                      <th className="px-4 py-3 text-center text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Articles
                      </th>
                      <SortableHeader
                        label="Montant"
                        sortKey="total_amount"
                        currentSort={sort}
                        onSort={toggleSort}
                        className="px-4 py-3 text-right text-muted-foreground"
                        style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}
                      />
                      <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Paiement
                      </th>
                      <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-muted-foreground" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Vendeur
                      </th>
                      <th className="px-4 py-3 w-28" />
                    </tr>
                  </thead>
                  <tbody key={`${statusFilter}-${search}-${page}`}>
                    {typedPaginated.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="w-8 h-8 opacity-40" />
                            <p className="text-sm">Aucune facture trouvée.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {typedPaginated.map((inv, idx) => (
                      <tr
                        key={inv.id}
                        className="group border-b border-border/60 transition-colors"
                        style={{
                          cursor: "pointer",
                          opacity: 0,
                          animation: 'slideInUp 0.3s ease forwards',
                          animationDelay: `${idx * 45}ms`,
                          background: idx % 2 !== 0 ? "hsl(30 20% 98%)" : "transparent",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(22 72% 48% / 0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 !== 0 ? "hsl(30 20% 98%)" : "transparent")}
                      >
                        {/* N° Facture */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-bold text-foreground tracking-tight">
                            {inv.invoice_number}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-sm tabular-nums text-muted-foreground">
                          {formatDate(inv.issued_at)}
                        </td>

                        {/* Client avec avatar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <ClientAvatar name={inv.client_name} />
                            <span className="text-sm font-medium text-foreground">
                              {inv.client_name ?? (
                                <span className="text-muted-foreground italic font-normal">Client comptoir</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Articles */}
                        <td className="px-4 py-3.5 text-center text-sm tabular-nums text-muted-foreground">
                          {inv.items?.length ?? 0}
                        </td>

                        {/* Montant en Fraunces */}
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className="font-bold text-sm font-editorial"
                            style={{
                              background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}
                          >
                            {formatFCFA(inv.total_amount)}
                          </span>
                        </td>

                        {/* Mode paiement pill */}
                        <td className="px-4 py-3.5">
                          <span
                            className="text-xs"
                            style={{ ...getPaymentStyle(inv.payment_method), transition: "background 0.2s, color 0.2s" }}
                          >
                            {getPaymentLabel(inv.payment_method)}
                          </span>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3.5">
                          <StatusBadge
                            label={STATUS_LABELS[inv.status]}
                            variant={STATUS_VARIANTS[inv.status]}
                          />
                        </td>

                        {/* Vendeur */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {inv.issued_by_name || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Actions — visible au hover */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 rounded-lg transition-colors hover:bg-muted"
                              title="Copier numéro"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(inv.invoice_number).then(() =>
                                  toast.success('Numéro copié !')
                                );
                              }}
                            >
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg transition-colors hover:bg-muted"
                              title="Voir"
                              onClick={() => setViewingInvoice(inv)}
                            >
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <InlinePrintButton invoice={inv} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {typedPaginated.length > 0 && (
                    <tfoot>
                      <tr
                        style={{
                          background: "linear-gradient(to right, hsl(22 72% 48% / 0.05), hsl(22 72% 48% / 0.02))",
                          borderTop: "2px solid hsl(22 72% 48% / 0.2)",
                        }}
                      >
                        <td
                          colSpan={4}
                          className="text-right text-xs uppercase tracking-wider font-bold text-muted-foreground py-3"
                        >
                          Total général
                        </td>
                        <td className="py-3 text-right px-4">
                          <span
                            className="font-bold text-lg font-editorial tabular-nums"
                            style={{
                              background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}
                          >
                            {formatFCFA(grandTotal)}
                          </span>
                        </td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Mobile : card list — md:hidden */}
            <div key={`mobile-${statusFilter}-${search}-${page}`} className="md:hidden space-y-2.5">
              {typedPaginated.length === 0 && (
                <div className="bg-card border rounded-2xl py-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Aucune facture trouvée.</p>
                </div>
              )}
              {typedPaginated.map((inv, idx) => (
                <div
                  key={inv.id}
                  className="bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all"
                  style={{
                    borderColor: "hsl(var(--border))",
                    opacity: 0,
                    animation: 'slideInUp 0.3s ease forwards',
                    animationDelay: `${idx * 45}ms`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(22 72% 48% / 0.4)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px hsl(22 72% 48% / 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                  }}
                >
                  {/* Header row : numéro + statut */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[11px] font-bold text-muted-foreground truncate tracking-tight">
                        {inv.invoice_number}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <ClientAvatar name={inv.client_name} />
                        <p className="text-sm font-semibold truncate">
                          {inv.client_name ?? (
                            <span className="text-muted-foreground italic font-normal">Client comptoir</span>
                          )}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                        {formatDate(inv.issued_at)}
                        <span className="mx-1.5 opacity-40">·</span>
                        {inv.items?.length ?? 0} article
                        {(inv.items?.length ?? 0) > 1 ? "s" : ""}
                        {inv.issued_by_name && (
                          <>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span className="not-tabular-nums">{inv.issued_by_name}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <StatusBadge
                      label={STATUS_LABELS[inv.status]}
                      variant={STATUS_VARIANTS[inv.status]}
                    />
                  </div>

                  {/* Footer row : total + paiement + actions */}
                  <div
                    className="flex items-center justify-between gap-3 pt-3"
                    style={{ borderTop: "1px solid hsl(var(--border))" }}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Total
                      </span>
                      <span
                        className="font-bold text-lg font-editorial tabular-nums leading-tight"
                        style={{
                          background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {formatFCFA(inv.total_amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[11px]"
                        style={{ ...getPaymentStyle(inv.payment_method), transition: "background 0.2s, color 0.2s" }}
                      >
                        {getPaymentLabel(inv.payment_method)}
                      </span>
                      <button
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Voir la facture"
                        onClick={() => setViewingInvoice(inv)}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <InlinePrintButton
                        invoice={inv}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        iconSize="w-4 h-4"
                      />
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
            <DialogTitle className="sr-only">Détail de la facture</DialogTitle>
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
