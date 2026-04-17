
import type { Supplier } from "@/services/supplierService";

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
  titleText:  "FFFFFFFF",
  metaBg:     "FFE0EAFF",
  metaText:   "FF1D4ED8",
  totalsBg:   "FFE5E7EB",
  totalsText: "FF111827",
  rowAlt:     "FFF8FAFC",
  rowWhite:   "FFFFFFFF",
  activeText: "FF166534",
  activeBg:   "FFDCFCE7",
  inactiveText: "FF6B7280",
  inactiveBg:   "FFF3F4F6",
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
  data: Supplier[],
  sheetName: string,
  sheetTitle: string
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const COL_COUNT = 8;

  ws.columns = [
    { key: "no",       width: 5  },
    { key: "name",     width: 28 },
    { key: "contact",  width: 22 },
    { key: "email",    width: 28 },
    { key: "phone",    width: 18 },
    { key: "country",  width: 18 },
    { key: "orders",   width: 14 },
    { key: "created",  width: 16 },
  ];

  // Ligne 1 : Titre
  const titleRow = ws.addRow([sheetTitle]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, COL_COUNT);
  const titleCell = titleRow.getCell(1);
  titleCell.fill = fill(COLORS.titleBg);
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Ligne 2 : Métadonnées
  const activeCount = data.filter((s) => (s.orders_count ?? 0) > 0).length;
  const totalOrders = data.reduce((sum, s) => sum + (s.orders_count ?? 0), 0);
  const metaRow = ws.addRow([
    `Généré le : ${todayLabel()}`, "",
    `Total fournisseurs : ${data.length}`, "",
    `Actifs : ${activeCount} | Total commandes : ${totalOrders}`, "", "", "",
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

  // Ligne 3 : Vide
  ws.addRow([]);

  // Ligne 4 : En-têtes
  const headers = ["N°", "Nom société", "Contact", "Email", "Téléphone", "Pays", "Nb produits", "Date création"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  ws.autoFilter = { from: "A4", to: "H4" };

  // Lignes de données
  data.forEach((supplier, idx) => {
    const rowBg = idx % 2 === 0 ? COLORS.rowWhite : COLORS.rowAlt;
    const ordersCount = supplier.orders_count ?? 0;
    const location = [supplier.city, supplier.country].filter(Boolean).join(", ");

    const dataRow = ws.addRow([
      idx + 1,
      supplier.name,
      supplier.contact_name || "",
      supplier.email || "",
      supplier.phone || "",
      location,
      ordersCount,
      formatDateFr(supplier.created_at),
    ]);
    dataRow.height = 18;

    dataRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
      applyDataCell(cell, rowBg);

      if (colIdx === 7) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        // Colorer selon activité
        if (ordersCount > 0) {
          cell.fill = fill(COLORS.activeBg);
          cell.font = { bold: true, color: { argb: COLORS.activeText }, size: 10 };
        } else {
          cell.fill = fill(COLORS.inactiveBg);
          cell.font = { color: { argb: COLORS.inactiveText }, size: 10 };
        }
      }
    });
  });

  // Ligne totaux
  const totalsRow = ws.addRow(["", "TOTAL", "", "", "", "", totalOrders, ""]);
  totalsRow.height = 22;
  totalsRow.eachCell({ includeEmpty: true }, (cell, colIdx) => {
    cell.fill = fill(COLORS.totalsBg);
    cell.font = { bold: true, color: { argb: COLORS.totalsText }, size: 11 };
    cell.border = border();
    if (colIdx === 7) cell.alignment = { horizontal: "right", vertical: "middle" };
  });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function exportSuppliers(data: Supplier[]): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAOSERVICES INVENTORY";
  wb.created = new Date();

  buildSheet(wb, data, "Fournisseurs", "NAOSERVICES INVENTORY — Fournisseurs");

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `fournisseurs-naoservices-${filenameDate()}.xlsx`);
}
