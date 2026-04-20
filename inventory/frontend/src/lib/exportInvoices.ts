
import type ExcelJS from "exceljs";
import type { Invoice } from "@/services/invoiceService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayLabel(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function filenameDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR");
}

function summarizeItems(invoice: Invoice): string {
  if (!invoice.items || invoice.items.length === 0) return "—";
  if (invoice.items.length === 1) {
    return `${invoice.items[0].product_name} ×${invoice.items[0].quantity}`;
  }
  const first = invoice.items[0].product_name;
  return `${first} + ${invoice.items.length - 1} autre(s)`;
}

const STATUS_LABELS: Record<Invoice["status"], string> = {
  paid: "Payé",
  partial: "Partiel",
  unpaid: "Non payé",
  cancelled: "Annulé",
};

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg:     "FF1D4ED8",
  headerText:   "FFFFFFFF",
  titleBg:      "FF1E3A5F",
  titleBgRed:   "FFDC2626",
  titleText:    "FFFFFFFF",
  metaBg:       "FFE0EAFF",
  metaText:     "FF1D4ED8",
  totalsBg:     "FFE5E7EB",
  totalsText:   "FF111827",
  rowAlt:       "FFF8FAFC",
  rowWhite:     "FFFFFFFF",
  paid:         { bg: "FFDCFCE7", text: "FF166534" },
  partial:      { bg: "FFFEF3C7", text: "FF92400E" },
  unpaid:       { bg: "FFFEE2E2", text: "FF991B1B" },
  cancelled:    { bg: "FFF3F4F6", text: "FF6B7280" },
  border:       "FFD1D5DB",
} as const;

type ArgbColor = string;

// ─── Style helpers ────────────────────────────────────────────────────────────

function fill(argb: ArgbColor): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function border(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: COLORS.border } };
  return { top: side, bottom: side, left: side, right: side };
}

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.fill = fill(COLORS.headerBg);
  cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 11 };
  cell.border = border();
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function applyDataCell(cell: ExcelJS.Cell, rowBg: ArgbColor): void {
  cell.fill = fill(rowBg);
  cell.border = border();
  cell.alignment = { vertical: "middle" };
}

function statusColors(status: Invoice["status"]): { bg: string; text: string } {
  return COLORS[status] ?? COLORS.cancelled;
}

// ─── Build sheet ──────────────────────────────────────────────────────────────

function buildInvoiceSheet(
  wb: ExcelJS.Workbook,
  data: Invoice[],
  sheetName: string,
  sheetTitle: string,
  titleBgColor: ArgbColor
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 9;

  ws.columns = [
    { key: "no",         width: 5  },
    { key: "number",     width: 22 },
    { key: "client",     width: 24 },
    { key: "date",       width: 14 },
    { key: "items",      width: 34 },
    { key: "subtotal",   width: 22 },
    { key: "discount",   width: 16 },
    { key: "total",      width: 22 },
    { key: "status",     width: 14 },
  ];

  // ── Ligne 1 : Titre ──────────────────────────────────────────────────────────
  const titleRow = ws.addRow([sheetTitle]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = fill(titleBgColor);
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // ── Ligne 2 : Métadonnées ────────────────────────────────────────────────────
  const grandTotal = data.reduce((s, inv) => s + Number(inv.total_amount), 0);
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "", "",
    `Total factures : ${data.length}`, "", "",
    `Montant total : ${grandTotal.toLocaleString("fr-FR")} FCFA`, "", "",
  ]);
  metaRow.height = 20;
  ws.mergeCells(2, 1, 2, 3);
  ws.mergeCells(2, 4, 2, 6);
  ws.mergeCells(2, 7, 2, 9);
  [1, 4, 7].forEach((c) => {
    const cell = metaRow.getCell(c);
    cell.fill = fill(COLORS.metaBg);
    cell.font = { italic: true, color: { argb: COLORS.metaText }, size: 10 };
    cell.alignment = { horizontal: c === 1 ? "left" : "center", vertical: "middle" };
    cell.border = border();
  });

  // ── Ligne 3 : Vide ───────────────────────────────────────────────────────────
  ws.addRow([]);

  // ── Ligne 4 : En-têtes ───────────────────────────────────────────────────────
  const headers = [
    "N°", "N° Facture", "Client", "Date",
    "Articles (résumé)", "Sous-total (FCFA)", "Remise (FCFA)",
    "Total (FCFA)", "Statut paiement",
  ];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  ws.autoFilter = { from: "A4", to: "I4" };

  // ── Lignes de données ────────────────────────────────────────────────────────
  data.forEach((inv, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const total = Number(inv.total_amount);
    const paid = Number(inv.amount_paid);
    const balanceDue = Number(inv.balance_due);
    // Sous-total = total (pas de remise exposée dans le modèle, on met 0)
    const discount = 0;

    const dataRow = ws.addRow([
      idx + 1,
      inv.invoice_number,
      inv.client_name ?? "Client comptoir",
      formatDate(inv.issued_at),
      summarizeItems(inv),
      total,
      discount,
      total,
      STATUS_LABELS[inv.status],
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);

      // Colonne statut (9) : couleur par statut
      if (colIdx === 9) {
        const c = statusColors(inv.status);
        cell.fill = fill(c.bg);
        cell.font = { bold: true, color: { argb: c.text }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      // Colonnes numériques FCFA (6, 7, 8)
      if ([6, 7, 8].includes(colIdx)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = '#,##0" FCFA"';
      }
      // Colonnes texte : alignement gauche
      if ([2, 3, 4, 5].includes(colIdx)) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });

    // Reste à payer en note si non nul
    if (balanceDue > 0) {
      dataRow.getCell(8).note = `Reste à payer : ${balanceDue.toLocaleString("fr-FR")} FCFA`;
    }
  });

  // ── Ligne totaux ─────────────────────────────────────────────────────────────
  const totalsRow = ws.addRow(["", "TOTAL", "", "", "", grandTotal, 0, grandTotal, ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if ([6, 8].includes(colIdx)) {
      cell.numFmt = '#,##0" FCFA"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportInvoicesToExcel(data: Invoice[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildInvoiceSheet(
    wb, data,
    "Toutes les factures",
    "NAOSERVICES INVENTORY — Export Factures",
    COLORS.titleBg
  );

  const unpaid = data.filter((inv) => inv.status !== "paid" && inv.status !== "cancelled");
  buildInvoiceSheet(
    wb, unpaid,
    "Factures impayées",
    "FACTURES IMPAYÉES — En attente de règlement",
    COLORS.titleBgRed
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `factures-naoservices-${filenameDate()}.xlsx`);
}
