import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { Printer, RefreshCw, PrinterCheck } from "lucide-react";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { useState, useRef } from "react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductBarcode {
  id: number;
  name: string;
  category: string;
  barcode: string | null;
}

// ─── Mock data (aligned with ProductsPage) ───────────────────────────────────

const INITIAL_PRODUCTS: ProductBarcode[] = [
  { id: 1, name: "Lait Nido 400g", category: "Alimentaire", barcode: "6001068002802" },
  { id: 2, name: "Huile Dinor 1L", category: "Alimentaire", barcode: "6001068002819" },
  { id: 3, name: "Riz Uncle Ben's 5kg", category: "Alimentaire", barcode: "6001068002826" },
  { id: 4, name: "Coca-Cola 1.5L", category: "Boissons", barcode: "5449000000996" },
  { id: 5, name: "Savon Palmolive", category: "Hygiène", barcode: "8714789763378" },
  { id: 6, name: "Pâtes Panzani 500g", category: "Alimentaire", barcode: "3038350012005" },
  { id: 7, name: "Sucre en poudre 1kg", category: "Alimentaire", barcode: "3256220010015" },
  { id: 8, name: "Eau Tangui 1.5L", category: "Boissons", barcode: "6291041500213" },
  { id: 9, name: "Biscuits Belvita", category: "Alimentaire", barcode: null },
  { id: 10, name: "Détergent Omo 1kg", category: "Entretien", barcode: null },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a random valid EAN-13.
 * The 13th digit is the check digit calculated from the first 12.
 */
function generateEAN13(): string {
  const digits: number[] = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));

  // EAN-13 check digit
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;

  return [...digits, checkDigit].join("");
}

// ─── Barcode label (print-safe) ──────────────────────────────────────────────

interface BarcodeLabelProps {
  product: ProductBarcode;
}

function BarcodeLabel({ product }: BarcodeLabelProps) {
  if (!product.barcode) return null;
  return (
    <div
      style={{
        width: "70mm",
        minHeight: "38mm",
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4mm 3mm 3mm",
        boxSizing: "border-box",
        gap: 2,
      }}
    >
      <Barcode
        value={product.barcode}
        width={1.6}
        height={48}
        fontSize={10}
        margin={0}
      />
      <div
        style={{
          fontSize: 10,
          fontFamily: "sans-serif",
          color: "#111",
          textAlign: "center",
          marginTop: 2,
          lineHeight: 1.3,
        }}
      >
        {product.name}
      </div>
    </div>
  );
}

// ─── Single-product printable card ────────────────────────────────────────────

interface PrintableCardProps {
  product: ProductBarcode;
}

function PrintableCard({ product }: PrintableCardProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Code-barres — ${product.name}`,
    pageStyle: `
      @page { size: 80mm 50mm; margin: 2mm; }
      body { margin: 0; display: flex; align-items: center; justify-content: center; }
    `,
  });

  return (
    <>
      {/* Hidden printable area for this product */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <BarcodeLabel product={product} />
        </div>
      </div>

      {/* Visible print button */}
      <Button
        size="sm"
        variant="outline"
        className="flex-1 text-xs"
        onClick={() => handlePrint()}
      >
        <Printer className="w-3.5 h-3.5 mr-1.5" />
        Imprimer
      </Button>
    </>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

interface ProductBarcodeCardProps {
  product: ProductBarcode;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onGenerate: (id: number) => void;
}

function ProductBarcodeCard({
  product,
  selected,
  onToggleSelect,
  onGenerate,
}: ProductBarcodeCardProps) {
  return (
    <div
      className={[
        "bg-card rounded-lg border p-4 flex flex-col gap-3 transition-all",
        selected ? "ring-2 ring-primary border-primary" : "hover:shadow-sm",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggleSelect(product.id)}
          className={[
            "mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors",
            selected
              ? "bg-primary border-primary"
              : "border-border hover:border-primary",
          ].join(" ")}
          aria-pressed={selected}
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ProductIcon name={product.name} category={product.category} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.category}</p>
          </div>
        </div>
      </div>

      {/* Barcode display or placeholder */}
      <div className="flex items-center justify-center min-h-[72px] bg-white rounded-md border overflow-hidden px-2 py-2">
        {product.barcode ? (
          <Barcode
            value={product.barcode}
            width={1.4}
            height={48}
            fontSize={10}
            margin={0}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <div className="flex gap-0.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted rounded-sm"
                  style={{
                    width: i % 3 === 0 ? 3 : 2,
                    height: 40,
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px]">Aucun code-barres</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!product.barcode ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => onGenerate(product.id)}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Générer EAN-13
          </Button>
        ) : (
          <PrintableCard product={product} />
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BarcodesPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [products, setProducts] = useState<ProductBarcode[]>(INITIAL_PRODUCTS);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Ref for multi-product print zone
  const selectionPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintSelection = useReactToPrint({
    contentRef: selectionPrintRef,
    documentTitle: "Codes-barres — sélection",
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      body { margin: 0; font-family: sans-serif; }
    `,
  });

  function handleGenerate(id: number) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, barcode: generateEAN13() } : p))
    );
  }

  function handleToggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  const selectedWithBarcode = products.filter(
    (p) => selected.has(p.id) && p.barcode
  );

  const allSelected = selected.size === products.length;

  return (
    <>
      <Topbar
        title="Codes-barres"
        subtitle="Génération et impression des codes-barres produits"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* Hidden multi-product print zone */}
        <div style={{ display: "none" }}>
          <div ref={selectionPrintRef}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 70mm)",
                gap: "6mm",
                padding: "4mm",
              }}
            >
              {selectedWithBarcode.map((product) => (
                <BarcodeLabel key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span
              className={[
                "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                allSelected ? "bg-primary border-primary" : "border-border",
              ].join(" ")}
            >
              {allSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            {selected.size > 0
              ? `${selected.size} produit${selected.size > 1 ? "s" : ""} sélectionné${selected.size > 1 ? "s" : ""}`
              : `${products.length} produits`}
          </span>

          <Button
            className="shrink-0 sm:ml-auto"
            disabled={selectedWithBarcode.length === 0}
            onClick={() => handlePrintSelection()}
          >
            <PrinterCheck className="w-4 h-4 mr-2" />
            Imprimer la sélection
            {selectedWithBarcode.length > 0 && (
              <span className="ml-1.5 bg-primary-foreground/20 text-primary-foreground text-xs rounded px-1.5 py-0.5">
                {selectedWithBarcode.length}
              </span>
            )}
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductBarcodeCard
              key={product.id}
              product={product}
              selected={selected.has(product.id)}
              onToggleSelect={handleToggleSelect}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      </div>
    </>
  );
}
