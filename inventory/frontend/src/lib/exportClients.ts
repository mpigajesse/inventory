
import type ExcelJS from "exceljs";
import type { Client } from "@/services/clientService";

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

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR");
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg:   "FF1D4ED8",
  headerText: "FFFFFFFF",
  titleBg:    "FF1E3A5F",
  titleBgAlt: "FF0F766E",
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

function buildSheet(
  wb: ExcelJS.Workbook,
  data: Client[],
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
    { key: "no",        width: 5  },
    { key: "name",      width: 28 },
    { key: "phone",     width: 18 },
    { key: "email",     width: 28 },
    { key: "city",      width: 18 },
    { key: "purchases", width: 14 },
    { key: "ca",        width: 24 },
    { key: "credit",    width: 20 },
    { key: "created",   width: 16 },
  ];

  // Ligne 1 : Titre
  const titleRow = ws.addRow([sheetTitle]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = fill(titleBgColor);
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Ligne 2 : Métadonnées
  const totalCa = data.reduce((s, c) => s + c.total_purchases, 0);
  const activeCount = data.filter((c) => c.purchases_count > 0).length;
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "", "",
    `Total clients : ${data.length}`, "", "",
    `CA total : ${totalCa.toLocaleString("fr-FR")} FCFA`, "", "",
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

  // Ligne 3 : Vide
  ws.addRow([]);

  // Ligne 4 : En-têtes
  const headers = ["N°", "Nom", "Téléphone", "Email", "Ville", "Nb commandes", "CA total (FCFA)", "Crédit (FCFA)", "Date création"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  ws.autoFilter = { from: "A4", to: "I4" };

  // Lignes de données
  data.forEach((client, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;

    const dataRow = ws.addRow([
      idx + 1,
      client.name,
      client.phone || "",
      client.email || "",
      client.city || "",
      client.purchases_count,
      client.total_purchases,
      client.credit_balance,
      formatDateFr(client.created_at),
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);

      if (colIdx === 6) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 7 || colIdx === 8) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
  });

  // Ligne totaux
  const totalPurchases = data.reduce((s, c) => s + c.purchases_count, 0);
  const totalsRow = ws.addRow(["", "TOTAL", "", "", "", totalPurchases, totalCa, "", ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 6) cell.alignment = { horizontal: "right", vertical: "middle" };
    if (colIdx === 7) {
      cell.numFmt = '#,##0" FCFA"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });

  // Ajouter un commentaire pour le compte actifs (utilisé dans la construction)
  void activeCount;
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportClients(data: Client[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildSheet(wb, data, "Tous les clients", "NAOSERVICES INVENTORY — Base Clients", COLORS.titleBg);

  const activeClients = data.filter((c) => c.purchases_count > 0);
  buildSheet(wb, activeClients, "Clients actifs", "CLIENTS ACTIFS — Au moins 1 commande", COLORS.titleBgAlt);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `clients-naoservices-${filenameDate()}.xlsx`);
}
