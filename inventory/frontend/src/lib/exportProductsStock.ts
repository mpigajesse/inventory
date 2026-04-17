
import type * as ExcelJS from "exceljs";
import type { Product } from "@/services/productService";
import type { StockItem } from "@/services/stockService";

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

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg:   "FF1D4ED8",
  headerText: "FFFFFFFF",
  titleBg:    "FF1E3A5F",
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
type ExcelJSModule = typeof ExcelJS;

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

// ─── Onglet Produits ──────────────────────────────────────────────────────────

function buildProductsSheet(wb: ExcelJS.Workbook, data: Product[]): void {
  const ws = wb.addWorksheet("Produits", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 6;

  ws.columns = [
    { key: "name",     width: 34 },
    { key: "cat",      width: 20 },
    { key: "barcode",  width: 20 },
    { key: "price",    width: 24 },
    { key: "purchase", width: 24 },
    { key: "active",   width: 14 },
  ];

  // Ligne 1 : Titre
  const titleRow = ws.addRow(["NAOSERVICES INVENTORY — Catalogue Produits"]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = fill(COLORS.titleBg);
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Ligne 2 : Métadonnées
  const activeCount = data.filter((p) => p.is_active).length;
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "",
    `Total produits : ${data.length}`, "",
    `Actifs : ${activeCount}`, "",
  ]);
  metaRow.height = 20;
  ws.mergeCells(2, 1, 2, 2);
  ws.mergeCells(2, 3, 2, 4);
  ws.mergeCells(2, 5, 2, 6);
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
  const headers = ["Nom produit", "Catégorie", "Code-barres", "Prix vente (FCFA)", "Prix achat (FCFA)", "Statut"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  ws.autoFilter = { from: "A4", to: "F4" };

  // Lignes de données
  data.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const dataRow = ws.addRow([
      item.name,
      item.category_name,
      item.barcode ?? "",
      item.selling_price,
      item.purchase_price,
      item.is_active ? "Actif" : "Inactif",
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      if (colIdx === 4 || colIdx === 5) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 6) {
        const isActive = item.is_active;
        cell.fill = fill(isActive ? COLORS.normal.bg : COLORS.critique.bg);
        cell.font = { bold: true, color: { argb: isActive ? COLORS.normal.text : COLORS.critique.text }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  // Ligne totaux
  const totalsRow = ws.addRow(["TOTAL", "", "", "", "", `${data.length} produits`]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
  });
}

// ─── Onglet Stock ─────────────────────────────────────────────────────────────

function buildStockSheet(wb: ExcelJS.Workbook, data: StockItem[]): void {
  const ws = wb.addWorksheet("Stock", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 7;

  ws.columns = [
    { key: "product",  width: 34 },
    { key: "cat",      width: 20 },
    { key: "qty",      width: 14 },
    { key: "min",      width: 12 },
    { key: "max",      width: 12 },
    { key: "value",    width: 26 },
    { key: "status",   width: 14 },
  ];

  // Ligne 1 : Titre
  const titleRow = ws.addRow(["NAOSERVICES INVENTORY — État du Stock"]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = fill(COLORS.titleBg);
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Ligne 2 : Métadonnées
  const totalValue = data.reduce((s, i) => s + i.stock_value, 0);
  const alertCount = data.filter((i) => i.status !== "normal").length;
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "",
    `Total références : ${data.length}`, "",
    `Alertes : ${alertCount}`, "",
    `Valeur totale : ${totalValue.toLocaleString("fr-FR")} FCFA`,
  ]);
  metaRow.height = 20;
  ws.mergeCells(2, 1, 2, 2);
  ws.mergeCells(2, 3, 2, 4);
  ws.mergeCells(2, 5, 2, 6);
  // Cellule 7 reste seule
  [1, 3, 5, 7].forEach((c) => {
    const cell = metaRow.getCell(c);
    cell.fill = fill(COLORS.metaBg);
    cell.font = { italic: true, color: { argb: COLORS.metaText }, size: 10 };
    cell.alignment = { horizontal: c === 1 ? "left" : "center", vertical: "middle" };
    cell.border = border();
  });

  // Ligne 3 : Vide
  ws.addRow([]);

  // Ligne 4 : En-têtes
  const headers = ["Produit", "Catégorie", "Qté", "Seuil min", "Seuil max", "Valeur stock (FCFA)", "Statut"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  ws.autoFilter = { from: "A4", to: "G4" };

  // Lignes de données
  data.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const statusLabel = item.status === "critique" ? "Critique" : item.status === "bas" ? "Bas" : "Normal";
    const dataRow = ws.addRow([
      item.product_name,
      item.category_name,
      item.quantity,
      item.min_threshold,
      item.max_threshold,
      item.stock_value,
      statusLabel,
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      if ([3, 4, 5].includes(colIdx)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 6) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 7) {
        const s = item.status;
        const c = s === "critique" ? COLORS.critique : s === "bas" ? COLORS.bas : COLORS.normal;
        cell.fill = fill(c.bg);
        cell.font = { bold: true, color: { argb: c.text }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });

  // Ligne totaux
  const totalQty = data.reduce((s, i) => s + i.quantity, 0);
  const totalsRow = ws.addRow(["TOTAL", "", totalQty, "", "", totalValue, ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 3) cell.alignment = { horizontal: "right", vertical: "middle" };
    if (colIdx === 6) {
      cell.numFmt = '#,##0" FCFA"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportProductsStockReport(
  products: Product[],
  stockItems: StockItem[]
): Promise<void> {
  const [ExcelJS, { saveAs }] = await Promise.all([
    import("exceljs") as Promise<ExcelJSModule>,
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildProductsSheet(wb, products);
  buildStockSheet(wb, stockItems);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `rapport-produits-stock-${filenameDate()}.xlsx`);
}
