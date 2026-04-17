
import type { DashboardStats } from "@/services/dashboardService";
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
  headerBg:      "FF1D4ED8",
  headerText:    "FFFFFFFF",
  titleBg:       "FF1E3A5F",
  titleBgRed:    "FFDC2626",
  titleBgGreen:  "FF059669",
  titleBgAmber:  "FFD97706",
  titleText:     "FFFFFFFF",
  metaBg:        "FFE0EAFF",
  metaText:      "FF1D4ED8",
  totalsBg:      "FFE5E7EB",
  totalsText:    "FF111827",
  kpiValue:      "FF1D4ED8",
  rowAlt:        "FFF8FAFC",
  rowWhite:      "FFFFFFFF",
  critique:      { bg: "FFFEE2E2", text: "FF991B1B" },
  bas:           { bg: "FFFEF3C7", text: "FF92400E" },
  normal:        { bg: "FFDCFCE7", text: "FF166534" },
  border:        "FFD1D5DB",
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

function addSheetTitle(
  ws: ExcelJS.Worksheet,
  title: string,
  colCount: number,
  titleBg: ArgbColor
): void {
  const titleRow = ws.addRow([title]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = fill(titleBg);
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
}

function addMetaRow(
  ws: ExcelJS.Worksheet,
  colCount: number,
  leftText: string,
  centerText: string,
  rightText: string
): void {
  // Divide columns into thirds; text must sit in the first cell of each merged range
  const third = Math.floor(colCount / 3);
  const twoThirds = third * 2;

  const cells: string[] = [];
  for (let i = 0; i < colCount; i++) cells.push("");
  cells[0] = leftText;           // column 1  — first cell of left third
  cells[third] = centerText;     // column third+1 — first cell of centre third
  cells[twoThirds] = rightText;  // column twoThirds+1 — first cell of right third

  const metaRow = ws.addRow(cells);
  metaRow.height = 20;

  ws.mergeCells(2, 1, 2, third);
  ws.mergeCells(2, third + 1, 2, twoThirds);
  ws.mergeCells(2, twoThirds + 1, 2, colCount);
  [1, third + 1, twoThirds + 1].forEach((c) => {
    const cell = metaRow.getCell(c);
    cell.fill = fill(COLORS.metaBg);
    cell.font = { italic: true, color: { argb: COLORS.metaText }, size: 10 };
    cell.alignment = { horizontal: c === 1 ? "left" : "center", vertical: "middle" };
    cell.border = border();
  });
}

// ─── Onglet 1 : Vue d'ensemble ────────────────────────────────────────────────

function buildOverviewSheet(
  wb: ExcelJS.Workbook,
  stats: DashboardStats
): void {
  const ws = wb.addWorksheet("Vue d'ensemble", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  ws.columns = [
    { key: "label",  width: 38 },
    { key: "value",  width: 26 },
    { key: "detail", width: 30 },
  ];

  addSheetTitle(ws, "NAOSERVICES INVENTORY — Rapport Global", 3, COLORS.titleBg);

  // Subtitle meta
  const metaRow = ws.addRow([`Généré le : ${todayLabel()}`, "", ""]);
  metaRow.height = 20;
  ws.mergeCells(2, 1, 2, 3);
  const metaCell = metaRow.getCell(1);
  metaCell.fill = fill(COLORS.metaBg);
  metaCell.font = { italic: true, color: { argb: COLORS.metaText }, size: 10 };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  metaCell.border = border();

  ws.addRow([]);

  // Section header
  const secRow = ws.addRow(["Indicateur clé", "Valeur", "Détail"]);
  secRow.height = 22;
  secRow.eachCell((cell) => applyHeaderStyle(cell));

  const kpis: Array<[string, string, string]> = [
    ["CA du jour",           `${Number(stats.today.revenue).toLocaleString("fr-FR")} FCFA`, `${stats.today.sales_count} vente(s)`],
    ["CA du mois",           `${Number(stats.month.revenue).toLocaleString("fr-FR")} FCFA`, `${stats.month.sales_count} vente(s)`],
    ["Produits en catalogue",`${stats.stock.total_products}`,                                "Total produits actifs"],
    ["Alertes stock bas",    `${stats.stock.low_count}`,                                     "Produits sous le seuil min"],
    ["Alertes stock critique",`${stats.stock.critical_count}`,                               "Produits en rupture imminente"],
    ["Clients enregistrés",  `${stats.clients.total}`,                                       "Base clients totale"],
  ];

  kpis.forEach(([label, value, detail], idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const dataRow = ws.addRow([label, value, detail]);
    dataRow.height = 22;
    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      if (colIdx === 1) cell.font = { bold: false, size: 11 };
      if (colIdx === 2) {
        cell.font = { bold: true, color: { argb: COLORS.kpiValue }, size: 13 };
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 3) {
        cell.font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // ── Ventes par jour (tableau récap) ─────────────────────────────────────────
  ws.addRow([]);
  const dayTitle = ws.addRow(["Ventes par jour (semaine en cours)", "", ""]);
  ws.mergeCells(dayTitle.number, 1, dayTitle.number, 3);
  dayTitle.height = 20;
  dayTitle.getCell(1).fill = fill(COLORS.titleBgAmber);
  dayTitle.getCell(1).font = { bold: true, color: { argb: COLORS.titleText }, size: 12 };
  dayTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  dayTitle.getCell(1).border = border();

  const dayHeader = ws.addRow(["Jour", "CA (FCFA)", "Nb transactions"]);
  dayHeader.height = 20;
  dayHeader.eachCell((cell) => applyHeaderStyle(cell));

  stats.sales_by_day.forEach((d, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const r = ws.addRow([d.day, d.total, d.count]);
    r.height = 18;
    r.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      if (colIdx === 2) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 3) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
  });
}

// ─── Onglet 2 : Stock critique ────────────────────────────────────────────────

function buildCriticalStockSheet(
  wb: ExcelJS.Workbook,
  stockAlerts: StockItem[]
): void {
  const ws = wb.addWorksheet("Stock critique", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 7;

  ws.columns = [
    { key: "no",       width: 5  },
    { key: "name",     width: 34 },
    { key: "category", width: 20 },
    { key: "qty",      width: 16 },
    { key: "min",      width: 14 },
    { key: "status",   width: 14 },
    { key: "value",    width: 24 },
  ];

  addSheetTitle(ws, "STOCK CRITIQUE — Produits à réapprovisionner", COL_COUNT, COLORS.titleBgRed);
  addMetaRow(
    ws, COL_COUNT,
    `Généré le : ${todayLabel()}`,
    `${stockAlerts.length} produit(s) en alerte`,
    `Au ${new Date().toLocaleDateString("fr-FR")}`
  );
  ws.addRow([]);

  const headers = ["N°", "Produit", "Catégorie", "Qté actuelle", "Seuil min", "Statut", "Valeur stock (FCFA)"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  ws.autoFilter = { from: "A4", to: "G4" };

  stockAlerts.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const statusLabel = item.status === "critique" ? "Critique" : item.status === "bas" ? "Bas" : "Normal";
    const dataRow = ws.addRow([
      idx + 1,
      item.product_name,
      item.category_name,
      item.quantity,
      item.min_threshold,
      statusLabel,
      item.stock_value,
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      if (colIdx === 6) {
        const c = item.status === "critique" ? COLORS.critique : COLORS.bas;
        cell.fill = fill(c.bg);
        cell.font = { bold: true, color: { argb: c.text }, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      if ([4, 5].includes(colIdx)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 7) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
  });

  // Totaux
  const totalValue = stockAlerts.reduce((s, i) => s + Number(i.stock_value), 0);
  const totalsRow = ws.addRow(["", "TOTAL", "", "", "", "", totalValue]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 7) {
      cell.numFmt = '#,##0" FCFA"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

// ─── Onglet 3 : Top 10 produits ───────────────────────────────────────────────

function buildTopProductsSheet(
  wb: ExcelJS.Workbook,
  stats: DashboardStats
): void {
  const ws = wb.addWorksheet("Top 10 produits", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  const COL_COUNT = 4;

  ws.columns = [
    { key: "rank",    width: 8  },
    { key: "name",    width: 38 },
    { key: "qty",     width: 18 },
    { key: "revenue", width: 26 },
  ];

  addSheetTitle(ws, "TOP 10 PRODUITS — Les plus vendus", COL_COUNT, COLORS.titleBgGreen);
  addMetaRow(
    ws, COL_COUNT,
    `Généré le : ${todayLabel()}`,
    `${stats.top_products.length} produit(s)`,
    `Période courante`
  );
  ws.addRow([]);

  const headers = ["Rang", "Produit", "Qté vendue", "CA généré (FCFA)"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  const top10 = stats.top_products.slice(0, 10);
  const maxRevenue = top10.length > 0 ? Math.max(...top10.map((p) => p.revenue)) : 1;

  top10.forEach((product, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const dataRow = ws.addRow([
      idx + 1,
      product.product__name,
      product.total_sold,
      product.revenue,
    ]);
    dataRow.height = 20;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);
      if (colIdx === 1) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        // Podium : top 3 en gras coloré
        if (idx === 0) cell.font = { bold: true, color: { argb: "FFD97706" }, size: 13 };
        else if (idx === 1) cell.font = { bold: true, color: { argb: "FF6B7280" }, size: 12 };
        else if (idx === 2) cell.font = { bold: true, color: { argb: "FFB45309" }, size: 11 };
        else cell.font = { size: 11 };
      }
      if (colIdx === 3) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
      if (colIdx === 4) {
        cell.numFmt = '#,##0" FCFA"';
        cell.alignment = { horizontal: "right", vertical: "middle" };
        // Barre de progression via remplissage proportionnel (commentaire note)
        const pct = maxRevenue > 0 ? Math.round((product.revenue / maxRevenue) * 100) : 0;
        cell.note = `${pct}% du top produit`;
      }
    });
  });

  // Totaux
  const totalQty = top10.reduce((s, p) => s + p.total_sold, 0);
  const totalRevenue = top10.reduce((s, p) => s + p.revenue, 0);
  const totalsRow = ws.addRow(["", "TOTAL TOP 10", totalQty, totalRevenue]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 3) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
    if (colIdx === 4) {
      cell.numFmt = '#,##0" FCFA"';
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export interface ReportExportData {
  stats: DashboardStats;
  stockAlerts: StockItem[];
}

export async function exportReportToExcel(data: ReportExportData): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildOverviewSheet(wb, data.stats);
  buildCriticalStockSheet(wb, data.stockAlerts);
  buildTopProductsSheet(wb, data.stats);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `rapport-naoservices-${filenameDate()}.xlsx`);
}
