
import type * as ExcelJS from "exceljs";

export interface StockItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  min: number;
  max: number;
  price?: number;
  stockValue?: number;
  status?: "normal" | "bas" | "critique";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Résout le niveau de stock.
 * Priorité : champ `status` du backend (source de vérité).
 * Fallback : recalcul local uniquement si `status` est absent.
 */
function getStockLevel(item: StockItem): "Critique" | "Bas" | "Normal" {
  if (item.status === "critique") return "Critique";
  if (item.status === "bas") return "Bas";
  if (item.status === "normal") return "Normal";
  // Fallback si status non fourni
  if (item.stock <= 0) return "Critique";
  if (item.min > 0 && item.stock <= item.min) return "Bas";
  return "Normal";
}

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
  headerBg:     "FF1D4ED8", // bleu primaire
  headerText:   "FFFFFFFF",
  titleBg:      "FF1E3A5F", // bleu foncé
  titleBgRed:   "FFDC2626", // rouge pour alertes
  titleText:    "FFFFFFFF",
  metaBg:       "FFE0EAFF", // bleu très clair
  metaText:     "FF1D4ED8",
  totalsBg:     "FFE5E7EB", // gris
  totalsText:   "FF111827",
  rowAlt:       "FFF8FAFC", // gris très clair (alternance)
  rowWhite:     "FFFFFFFF",
  critique:     { bg: "FFFEE2E2", text: "FF991B1B" },
  bas:          { bg: "FFFEF3C7", text: "FF92400E" },
  normal:       { bg: "FFDCFCE7", text: "FF166534" },
  border:       "FFD1D5DB",
} as const;

// ─── Style helpers ────────────────────────────────────────────────────────────

type ArgbColor = string;
type ExcelJSModule = typeof ExcelJS;

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
  data: StockItem[],
  sheetName: string,
  sheetTitle: string,
  titleBgColor: ArgbColor
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 9;

  // ── Largeurs colonnes ────────────────────────────────────────────────────────
  ws.columns = [
    { key: "no",       width: 5  },
    { key: "name",     width: 34 },
    { key: "cat",      width: 18 },
    { key: "stock",    width: 14 },
    { key: "min",      width: 12 },
    { key: "max",      width: 12 },
    { key: "status",   width: 14 },
    { key: "price",    width: 22 },
    { key: "value",    width: 24 },
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
  // Priorité : valeur précalculée par le backend (stock_value).
  // Fallback : recalcul local si stockValue absent.
  const totalValue = data.reduce((s, i) => {
    const v = i.stockValue ?? (i.stock * (i.price ?? 0));
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "", "",
    `Total produits : ${data.length}`, "", "",
    `Valeur stock : ${totalValue > 0 ? totalValue.toLocaleString("fr-FR") + " FCFA" : "N/A"}`, "", "",
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
  const headers = ["N°", "Produit", "Catégorie", "Stock actuel", "Seuil min", "Seuil max", "Statut", "Prix unitaire (FCFA)", "Valeur totale (FCFA)"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  // Filtre automatique sur la ligne d'en-têtes
  ws.autoFilter = { from: "A4", to: "I4" };

  // ── Lignes de données ────────────────────────────────────────────────────────
  data.forEach((item, idx) => {
    const level = getStockLevel(item);
    const price = item.price ?? 0;
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;

    // Valeur de la ligne : priorité backend, fallback calcul local
    const lineValue = item.stockValue ?? (price > 0 ? item.stock * price : 0);
    const dataRow = ws.addRow([
      idx + 1,
      item.name ?? "—",
      item.category ?? "—",
      item.stock,
      item.min,
      item.max,
      level,
      price > 0 ? price : "",
      lineValue > 0 ? lineValue : "",
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      // Colonne statut (7) : couleur selon niveau
      if (colIdx === 7) {
        const c = level === "Critique" ? COLORS.critique : level === "Bas" ? COLORS.bas : COLORS.normal;
        cell.fill = fill(c.bg);
        cell.font = { bold: true, color: { argb: c.text }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      // Colonnes numériques (4-6, 8-9) : alignement droite
      if ([4, 5, 6, 8, 9].includes(colIdx)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (colIdx >= 8 && price > 0) {
          cell.numFmt = '#,##0" FCFA"';
        }
      }
    });
  });

  // ── Ligne totaux ─────────────────────────────────────────────────────────────
  const totalStock = data.reduce((s, i) => s + (Number.isFinite(i.stock) ? i.stock : 0), 0);
  const totalsRow = ws.addRow(["", "TOTAL", "", totalStock, "", "", "", "", totalValue > 0 ? totalValue : ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 9 && totalValue > 0) cell.numFmt = '#,##0" FCFA"';
    if ([4, 9].includes(colIdx)) cell.alignment = { horizontal: "right", vertical: "middle" };
  });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportStockToExcel(data: StockItem[]): Promise<void> {
  // Lazy-load ExcelJS and file-saver to keep the main bundle small.
  // file-saver peut exposer saveAs directement ou via .default selon bundler/version.
  const [ExcelJS, fileSaverMod] = await Promise.all([
    import("exceljs") as Promise<ExcelJSModule>,
    import("file-saver"),
  ]);
  const saveAs: (blob: Blob, name: string) => void =
    (fileSaverMod as unknown as { saveAs: (b: Blob, n: string) => void }).saveAs ??
    (fileSaverMod as unknown as { default: { saveAs: (b: Blob, n: string) => void } }).default?.saveAs;

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildSheet(wb, data, "Stock Complet", "NAOSERVICES INVENTORY — Export Stock Complet", COLORS.titleBg);

  const alertItems = data.filter((i) => getStockLevel(i) !== "Normal");
  buildSheet(wb, alertItems, "Alertes Stock", "ALERTES STOCK — Produits à réapprovisionner", COLORS.titleBgRed);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `stock-naoservices-${filenameDate()}.xlsx`);
}
