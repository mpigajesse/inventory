
import type { Product } from "@/services/productService";

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

function stockStatusLabel(status: Product["stock_status"]): string {
  if (status === "critique") return "Critique";
  if (status === "bas") return "Bas";
  return "Normal";
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg:   "FF1D4ED8",
  headerText: "FFFFFFFF",
  titleBg:    "FF1E3A5F",
  titleBgRed: "FFDC2626",
  titleText:  "FFFFFFFF",
  metaBg:     "FFE0EAFF",
  metaText:   "FF1D4ED8",
  totalsBg:   "FFE5E7EB",
  totalsText: "FF111827",
  rowAlt:     "FFF8FAFC",
  rowWhite:   "FFFFFFFF",
  critique:   { bg: "FFFEE2E2", text: "FF991B1B" },
  bas:        { bg: "FFFEF3C7", text: "FF92400E" },
  normal:     { bg: "FFDCFCE7", text: "FF166534" },
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
  data: Product[],
  sheetName: string,
  sheetTitle: string,
  titleBgColor: ArgbColor
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 7;

  ws.columns = [
    { key: "no",       width: 5  },
    { key: "name",     width: 34 },
    { key: "cat",      width: 18 },
    { key: "price",    width: 22 },
    { key: "stock",    width: 14 },
    { key: "barcode",  width: 20 },
    { key: "status",   width: 14 },
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
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "",
    `Total produits : ${data.length}`, "",
    `Alertes : ${data.filter((p) => p.stock_status !== "normal").length}`, "", "",
  ]);
  metaRow.height = 20;
  ws.mergeCells(2, 1, 2, 2);
  ws.mergeCells(2, 3, 2, 4);
  ws.mergeCells(2, 5, 2, 7);
  [1, 3, 5].forEach((c) => {
    const cell = metaRow.getCell(c);
    cell.fill = fill(COLORS.metaBg);
    cell.font = { italic: true, color: { argb: COLORS.metaText }, size: 10 };
    cell.alignment = { horizontal: c === 1 ? "left" : "center", vertical: "middle" };
    cell.border = border();
  });

  // Ligne 3 : Vide
  ws.addRow([]);

  // Ligne 4 : En-têtes
  const headers = ["N°", "Nom produit", "Catégorie", "Prix unitaire (FCFA)", "Stock actuel", "Code-barres", "Statut stock"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  ws.autoFilter = { from: "A4", to: "G4" };

  // Lignes de données
  data.forEach((item, idx) => {
    const level = stockStatusLabel(item.stock_status);
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;

    const dataRow = ws.addRow([
      idx + 1,
      item.name,
      item.category_name,
      item.selling_price,
      item.stock_quantity,
      item.barcode ?? "",
      level,
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);

      // Colonne prix (4) : format FCFA
      if (colIdx === 4) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      // Colonne stock (5) : droite
      if (colIdx === 5) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      // Colonne statut (7) : couleur selon niveau
      if (colIdx === 7) {
        const s = item.stock_status;
        const c = s === "critique" ? COLORS.critique : s === "bas" ? COLORS.bas : COLORS.normal;
        cell.fill = fill(c.bg);
        cell.font = { bold: true, color: { argb: c.text }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  // Ligne totaux
  const totalStock = data.reduce((s, i) => s + i.stock_quantity, 0);
  const totalsRow = ws.addRow(["", "TOTAL", "", "", totalStock, "", ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 5) cell.alignment = { horizontal: "right", vertical: "middle" };
  });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportProducts(data: Product[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildSheet(wb, data, "Tous les produits", "NAOSERVICES INVENTORY — Catalogue Produits", COLORS.titleBg);

  const alertItems = data.filter((p) => p.stock_status !== "normal");
  buildSheet(wb, alertItems, "Alertes rupture", "ALERTES RUPTURE — Produits à réapprovisionner", COLORS.titleBgRed);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `produits-naoservices-${filenameDate()}.xlsx`);
}
