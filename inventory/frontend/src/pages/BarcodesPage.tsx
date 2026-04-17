import { useOutletContext, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { Printer, RefreshCw, PrinterCheck, Search, QrCode, Wand2 } from "lucide-react";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/productService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductBarcode {
  id: number;
  name: string;
  category: string;
  category_name?: string;
  barcode: string | null;
  selling_price?: number;
  image_url: string | null;
}

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
        width: "58mm",
        minHeight: "40mm",
        background: "#fff",
        border: "1px solid #bbb",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3mm 2mm 2mm",
        boxSizing: "border-box",
        gap: 1,
        fontFamily: "sans-serif",
      }}
    >
      {/* Barcode graphic */}
      <Barcode
        value={product.barcode}
        width={1.3}
        height={44}
        fontSize={0}
        margin={0}
        displayValue={false}
      />
      {/* Barcode number */}
      <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.08em", fontFamily: "monospace", marginTop: 1 }}>
        {product.barcode}
      </div>
      {/* Product name */}
      <div style={{ fontSize: 10, fontWeight: 700, color: "#111", textAlign: "center", lineHeight: 1.2, marginTop: 2, maxWidth: "52mm" }}>
        {product.name}
      </div>
      {/* Price */}
      {product.selling_price != null && (
        <div style={{ fontSize: 12, fontWeight: 900, color: "#111", marginTop: 2, letterSpacing: "0.02em" }}>
          {product.selling_price.toLocaleString("fr-FR")} FCFA
        </div>
      )}
      {/* Category */}
      {product.category && (
        <div style={{ fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 1 }}>
          {product.category}
        </div>
      )}
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
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
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
      <button
        type="button"
        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold"
        style={{
          background: 'hsl(22 72% 48% / 0.1)',
          color: 'hsl(22 72% 48%)',
          borderRadius: 100,
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          border: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'hsl(22 72% 48% / 0.2)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px hsl(22 72% 48% / 0.2)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'hsl(22 72% 48% / 0.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
        onClick={() => handlePrint()}
      >
        <Printer className="w-3.5 h-3.5" />
        Imprimer
      </button>
    </>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

interface ProductBarcodeCardProps {
  product: ProductBarcode;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onGenerate: (id: number) => void;
  index?: number;
}

function ProductBarcodeCard({
  product,
  selected,
  onToggleSelect,
  onGenerate,
  index = 0,
}: ProductBarcodeCardProps) {
  const hasBarcode = Boolean(product.barcode);

  return (
    <div
      className={[
        "bg-card p-4 flex flex-col gap-3",
        hasBarcode
          ? "border border-l-4 border-l-[hsl(var(--success))] border-border/70"
          : "border border-border/70",
        selected
          ? "ring-2 ring-primary border-primary"
          : "",
      ].join(" ")}
      style={{
        borderRadius: 18,
        boxShadow: selected
          ? '0 6px 20px hsl(22 72% 48% / 0.2)'
          : '0 1px 4px hsl(22 30% 15% / 0.06)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        opacity: 0,
        animation: 'barcodeCardIn 0.35s ease forwards',
        animationDelay: `${index * 55}ms`,
      }}
      onMouseEnter={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px hsl(22 45% 30% / 0.18)';
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px hsl(22 30% 15% / 0.06)';
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Checkbox custom */}
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
          <ProductIcon name={product.name} category={product.category} size="sm" imageUrl={product.image_url} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.category}</p>
          </div>
          {hasBarcode && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] ring-1 ring-[hsl(var(--success)/0.25)]">
              <QrCode className="w-2.5 h-2.5" />
              EAN-13
            </span>
          )}
        </div>
      </div>

      {/* Barcode display or placeholder */}
      <div
        className="flex flex-col items-center justify-center min-h-[76px] overflow-hidden px-2 py-2"
        style={{
          background: '#ffffff',
          borderRadius: 10,
          boxShadow: 'inset 0 0 0 1px hsl(var(--border) / 0.4), 0 1px 3px hsl(0 0% 0% / 0.04)',
        }}
      >
        {product.barcode ? (
          <>
            <Barcode
              value={product.barcode}
              width={1.2}
              height={48}
              fontSize={10}
              margin={0}
            />
            {/* EAN digits in plain text — user can verify without printing */}
            <span className="font-mono text-[9px] text-center text-muted-foreground leading-tight mt-0.5 select-all">
              {product.barcode}
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <div className="flex gap-0.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted rounded-sm"
                  style={{
                    width: i % 3 === 0 ? 3 : 2,
                    height: 40,
                    opacity: 0.35,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium">Aucun code-barres</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!product.barcode ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9 rounded-lg border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all"
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
  const { can } = usePermissions();

  if (!can('view_barcodes')) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getAll(),
  });

  // Local overrides for generated barcodes (for products without one)
  const [generatedBarcodes, setGeneratedBarcodes] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const queryClient = useQueryClient();

  // Merge API data with any locally generated barcodes
  const products: ProductBarcode[] = useMemo(() => {
    const raw = data?.results ?? [];
    return raw.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category_name,
      category_name: p.category_name,
      barcode: generatedBarcodes[p.id] ?? p.barcode,
      selling_price: p.selling_price,
      image_url: p.image_url,
    }));
  }, [data, generatedBarcodes]);

  // Filtered by search query
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  // Ref for multi-product print zone
  const selectionPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintSelection = useReactToPrint({
    contentRef: selectionPrintRef,
    documentTitle: "Codes-barres — sélection",
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; font-family: sans-serif; }
    `,
  });

  function handleGenerate(id: number) {
    setGeneratedBarcodes((prev) => ({ ...prev, [id]: generateEAN13() }));
  }

  const handleGenerateAll = useCallback(async () => {
    const missing = products.filter((p) => !p.barcode);
    if (missing.length === 0) return;

    setIsGeneratingAll(true);
    let done = 0;
    const toastId = toast.loading(`Génération en cours… 0 / ${missing.length}`);

    for (const product of missing) {
      try {
        await productService.generateBarcode(product.id);
      } catch {
        // silently skip failed items; they remain without barcode
      }
      done += 1;
      toast.loading(`Génération en cours… ${done} / ${missing.length}`, { id: toastId });
    }

    toast.success(`${done} code${done > 1 ? "s-barres générés" : "-barres généré"}`, { id: toastId });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    setIsGeneratingAll(false);
  }, [products, queryClient]);

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
    if (selected.size === filteredProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProducts.map((p) => p.id)));
    }
  }

  const selectedWithBarcode = products.filter(
    (p) => selected.has(p.id) && p.barcode
  );

  const allSelected = filteredProducts.length > 0 && selected.size === filteredProducts.length;

  const withBarcodeCount = products.filter((p) => Boolean(p.barcode)).length;
  const totalCount = products.length;
  const missingCount = totalCount - withBarcodeCount;

  return (
    <TooltipProvider>
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
                gridTemplateColumns: "repeat(auto-fill, 58mm)",
                gap: "4mm",
                padding: "0",
              }}
            >
              {selectedWithBarcode.map((product) => (
                <BarcodeLabel key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))' }}
            >
              <QrCode className="w-5 h-5 text-white" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
                  Codes-barres
                </h2>
                {!isLoading && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                    aria-label={`${withBarcodeCount} produits avec code-barres sur ${totalCount}`}
                  >
                    <QrCode className="w-3 h-3" />
                    {withBarcodeCount} / {totalCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading
                  ? "Chargement…"
                  : `${totalCount - withBarcodeCount} produit${(totalCount - withBarcodeCount) !== 1 ? "s" : ""} sans code-barres`}
              </p>
            </div>
          </div>

          {/* Bouton générer les manquants */}
          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl gap-2"
              disabled={missingCount === 0 || isGeneratingAll || isLoading}
              onClick={handleGenerateAll}
            >
              <Wand2 className="w-4 h-4" />
              Générer les manquants
              {missingCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-muted text-[10px] font-bold px-1.5 text-muted-foreground">
                  {missingCount} manquant{missingCount > 1 ? "s" : ""}
                </span>
              )}
            </Button>
          </div>

          {/* Bouton imprimer la sélection — with tooltip when disabled */}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span wrapper required: Tooltip needs a focusable child even when button is disabled */}
              <span className="shrink-0 inline-flex">
                <button
                  type="button"
                  disabled={selectedWithBarcode.length === 0}
                  onClick={() => handlePrintSelection()}
                  className="btn-primary h-10 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <PrinterCheck className="w-4 h-4" />
                  Imprimer la sélection
                  {selectedWithBarcode.length > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-[hsl(0_0%_100%/0.22)] text-[10px] font-bold px-1.5">
                      {selectedWithBarcode.length}
                    </span>
                  )}
                </button>
              </span>
            </TooltipTrigger>
            {selectedWithBarcode.length === 0 && (
              <TooltipContent side="bottom">
                Sélectionnez des produits avec un code-barres
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {isError && (
          <p className="text-sm text-destructive mb-4 bg-destructive/10 rounded-lg px-4 py-3">
            Impossible de charger les produits. Vérifiez votre connexion.
          </p>
        )}

        {/* ── Toolbar : sélection + recherche ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          {/* Select-all */}
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={isLoading || filteredProducts.length === 0}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 shrink-0"
          >
            <span
              className={[
                "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
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

          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
              {selected.size} produit{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
            </span>
          )}

          {/* Champ de recherche par nom de produit */}
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 border-border/60 text-sm"
              style={{
                borderRadius: 14,
                boxShadow: '0 1px 4px hsl(0 0% 0% / 0.05)',
              }}
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border/70 p-4 h-[200px] animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-4 h-4 rounded bg-muted mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-[76px] bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
              <Search className="w-5 h-5" />
            </span>
            <p className="text-sm">
              {search ? `Aucun produit pour « ${search} »` : "Aucun produit disponible."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-primary hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product, index) => (
              <ProductBarcodeCard
                key={product.id}
                product={product}
                selected={selected.has(product.id)}
                onToggleSelect={handleToggleSelect}
                onGenerate={handleGenerate}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
