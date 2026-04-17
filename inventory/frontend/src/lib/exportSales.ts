
import type { Sale } from "@/services/salesService";

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

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function summarizeItems(sale: Sale): string {
  if (!sale.items || sale.items.length === 0) return "—";
  if (sale.items.length === 1) {
    return `${sale.items[0].product_name} ×${sale.items[0].quantity}`;
  }
  const first = sale.items[0].product_name;
  return `${first} + ${sale.items.length - 1} autre(s)`;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash:         "Espèces",
  mobile_money: "Mobile Money",
  card:         "Carte",
  credit:       "Crédit",
};

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg:   "FF1D4ED8",
  headerText: "FFFFFFFF",
  titleBg:    "FF1E3A5F",
  titleBgDay: "FF059669",   // vert pour ventes du jour
  titleText:  "FFFFFFFF",
  metaBg:     "FFE0EAFF",
  metaText:   "FF1D4ED8",
  totalsBg:   "FFE5E7EB",
  totalsText: "FF111827",
  rowAlt:     "FFF8FAFC",
  rowWhite:   "FFFFFFFF",
  border:     "FFD1D5DB",
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

// ─── Build sheet ──────────────────────────────────────────────────────────────

function buildSalesSheet(
  wb: ExcelJS.Workbook,
  data: Sale[],
  sheetName: string,
  sheetTitle: string,
  titleBgColor: ArgbColor
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 8;

  ws.columns = [
    { key: "no",       width: 5  },
    { key: "datetime", width: 20 },
    { key: "cashier",  width: 20 },
    { key: "items",    width: 36 },
    { key: "total",    width: 22 },
    { key: "paid",     width: 22 },
    { key: "change",   width: 22 },
    { key: "payment",  width: 18 },
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
  const grandTotal = data.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "",
    `Total transactions : ${data.length}`, "",
    `CA total : ${grandTotal.toLocaleString("fr-FR")} FCFA`, "", "", "",
  ]);
  metaRow.height = 20;
  ws.mergeCells(2, 1, 2, 2);
  ws.mergeCells(2, 3, 2, 4);
  ws.mergeCells(2, 5, 2, 8);
  [1, 3, 5].forEach((c) => {
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
    "N°", "Date / Heure", "Vendeur", "Articles (résumé)",
    "Total (FCFA)", "Montant donné (FCFA)", "Monnaie rendue (FCFA)", "Mode paiement",
  ];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  ws.autoFilter = { from: "A4", to: "H4" };

  // ── Lignes de données ────────────────────────────────────────────────────────
  data.forEach((sale, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const dataRow = ws.addRow([
      idx + 1,
      formatDateTime(sale.created_at),
      sale.cashier_name,
      summarizeItems(sale),
      Number(sale.total_amount),
      Number(sale.amount_paid),
      Number(sale.change_given),
      paymentLabel(sale.payment_method),
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      // Colonnes FCFA (5, 6, 7)
      if ([5, 6, 7].includes(colIdx)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = '#,##0" FCFA"';
      }
      // Colonnes texte
      if ([2, 3, 4, 8].includes(colIdx)) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  });

  // ── Ligne totaux (sous-total journalier / global) ──────────────────────────
  const totalPaid = data.reduce((s, sale) => s + Number(sale.amount_paid), 0);
  const totalChange = data.reduce((s, sale) => s + Number(sale.change_given), 0);
  const totalsRow = ws.addRow(["", "TOTAL", "", "", grandTotal, totalPaid, totalChange, ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if ([5, 6, 7].includes(colIdx)) {
      cell.numFmt = '#,##0" FCFA"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

// ─── Export ventes de la semaine ─────────────────────────────────────────────

export async function exportWeeklySales(data: Sale[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  const weekLabel = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  buildSalesSheet(
    wb, data,
    "Ventes de la semaine",
    `VENTES DE LA SEMAINE — ${weekLabel}`,
    COLORS.titleBg
  );

  const today = filenameDate();
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `ventes-semaine-${today}.xlsx`);
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportSalesToExcel(data: Sale[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildSalesSheet(
    wb, data,
    "Toutes les ventes",
    "NAOSERVICES INVENTORY — Export Ventes",
    COLORS.titleBg
  );

  const today = isoToday();
  const todaySales = data.filter((sale) => sale.created_at.startsWith(today));
  buildSalesSheet(
    wb, todaySales,
    "Ventes du jour",
    `VENTES DU JOUR — ${new Date().toLocaleDateString("fr-FR")}`,
    COLORS.titleBgDay
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `ventes-naoservices-${filenameDate()}.xlsx`);
}
