import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Banknote,
  CheckCircle,
  X,
  Printer,
  AlertTriangle,
  ScanLine,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { productService } from "@/services/productService";
import { salesService } from "@/services/salesService";
import type { SaleCreatePayload } from "@/services/salesService";
import type { Product as ApiProduct } from "@/services/productService";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Local types ─────────────────────────────────────────────────────────────

interface CartItem {
  id: number;
  name: string;
  barcode: string | null;
  price: number;
  category: string;
  stock: number;
  qty: number;
  imageUrl: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(): { date: string; time: string } {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

// ─── Ticket de caisse ─────────────────────────────────────────────────────────

interface ReceiptProps {
  items: CartItem[];
  total: number;
  amountGiven: number;
  change: number;
  ticketNumber: string;
  date: string;
  time: string;
}

function Receipt({ items, total, amountGiven, change, ticketNumber, date, time }: ReceiptProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const printedAt = new Date().toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const COL_NAME = 18;
  const COL_QTY  = 3;
  const COL_PU   = 8;

  function padL(s: string, n: number): string {
    return s.slice(0, n).padEnd(n, " ");
  }
  function padR(s: string, n: number): string {
    return s.slice(0, n).padStart(n, " ");
  }
  function fmtPrice(n: number): string {
    return n.toLocaleString("fr-FR");
  }

  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "11.5px",
        lineHeight: "1.55",
        width: "100%",
        color: "#111",
        background: "#fff",
        letterSpacing: "0.01em",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{ textAlign: "center", paddingBottom: "6px" }}>
        <div style={{ fontSize: "15px", fontWeight: "900", letterSpacing: "0.12em", marginBottom: "2px" }}>
          NAOSERVICES INVENTORY
        </div>
        <div style={{ fontSize: "10px", letterSpacing: "0.08em", opacity: 0.7, marginBottom: "4px" }}>
          Votre commerce de confiance
        </div>
        <div style={{ fontSize: "10px", opacity: 0.6 }}>Libreville, Gabon  |  +241 07 40 13 02</div>
      </div>

      <div style={{ textAlign: "center", letterSpacing: "0.05em", fontSize: "11px", margin: "4px 0" }}>
        {"═".repeat(38)}
      </div>

      {/* ── TRANSACTION INFO ───────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0 2px" }}>
        <span style={{ fontWeight: "700", letterSpacing: "0.04em" }}>{ticketNumber}</span>
        <span>{date}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "10.5px", opacity: 0.65, marginBottom: "6px" }}>
        <span>Heure : {time}</span>
      </div>

      <div style={{ textAlign: "center", fontSize: "11px", margin: "4px 0" }}>
        {"─".repeat(38)}
      </div>

      {/* ── ARTICLES HEADER ────────────────────────────── */}
      <div style={{ display: "flex", fontWeight: "700", fontSize: "10.5px", letterSpacing: "0.06em", margin: "4px 0 2px" }}>
        <span style={{ flex: "0 0 auto", width: `${COL_NAME}ch` }}>DÉSIGNATION</span>
        <span style={{ flex: "0 0 auto", width: `${COL_QTY}ch`, textAlign: "right" }}>QT</span>
        <span style={{ flex: "0 0 auto", width: `${COL_PU}ch`, textAlign: "right" }}>P.U.</span>
        <span style={{ flex: "1", textAlign: "right" }}>TOTAL</span>
      </div>
      <div style={{ fontSize: "11px", margin: "1px 0 4px" }}>{"─".repeat(38)}</div>

      {/* ── ARTICLES LINES ─────────────────────────────── */}
      {items.map(item => {
        const lineTotal = item.price * item.qty;
        const name = padL(item.name, COL_NAME);
        const qty  = padR(String(item.qty), COL_QTY);
        const pu   = padR(fmtPrice(item.price), COL_PU);
        const tot  = fmtPrice(lineTotal);
        return (
          <div key={item.id} style={{ marginBottom: "5px" }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ flex: "0 0 auto", width: `${COL_NAME}ch`, overflow: "hidden", whiteSpace: "nowrap" }}>{name}</span>
              <span style={{ flex: "0 0 auto", width: `${COL_QTY}ch`, textAlign: "right" }}>{qty}</span>
              <span style={{ flex: "0 0 auto", width: `${COL_PU}ch`, textAlign: "right" }}>{pu}</span>
              <span style={{ flex: "1", textAlign: "right", fontWeight: "600" }}>{tot}</span>
            </div>
            {item.name.length > COL_NAME && (
              <div style={{ fontSize: "10px", opacity: 0.7, paddingLeft: "2px" }}>
                {item.name.slice(COL_NAME)}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: "11px", margin: "4px 0" }}>{"─".repeat(38)}</div>

      {/* ── SOUS-TOTAL ─────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
        <span style={{ opacity: 0.7 }}>Sous-total HT</span>
        <span>{fmtPrice(subtotal)} FCFA</span>
      </div>

      <div style={{ fontSize: "11px", margin: "4px 0" }}>{"═".repeat(38)}</div>

      {/* ── TOTAL ──────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 0 6px" }}>
        <span style={{ fontSize: "13px", fontWeight: "900", letterSpacing: "0.1em" }}>TOTAL</span>
        <span style={{ fontSize: "15px", fontWeight: "900", letterSpacing: "0.04em" }}>
          {fmtPrice(total)} FCFA
        </span>
      </div>

      <div style={{ fontSize: "11px", margin: "2px 0 6px" }}>{"─".repeat(38)}</div>

      {/* ── PAIEMENT ───────────────────────────────────── */}
      <div style={{ margin: "4px 0 2px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ opacity: 0.75 }}>[+] Montant recu</span>
          <span style={{ fontWeight: "600" }}>{fmtPrice(amountGiven)} FCFA</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ opacity: 0.75 }}>[&lt;] Monnaie rendue</span>
          <span style={{ fontWeight: "700" }}>{fmtPrice(change)} FCFA</span>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "11px", margin: "8px 0 4px" }}>{"═".repeat(38)}</div>

      {/* ── QR PLACEHOLDER ─────────────────────────────── */}
      <div style={{ textAlign: "center", margin: "6px 0" }}>
        <div style={{ fontSize: "9px", letterSpacing: "0.03em", lineHeight: "1.1", fontFamily: "monospace", display: "inline-block" }}>
          {["+-------+", "|* * * *|", "| *   * |", "|* * * *|", "+-------+"].map((row, i) => (
            <div key={i}>{row}</div>
          ))}
        </div>
        <div style={{ fontSize: "9px", opacity: 0.5, marginTop: "2px", letterSpacing: "0.04em" }}>
          SCAN POUR VÉRIFIER
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <div style={{ textAlign: "center", fontSize: "11px", margin: "4px 0 2px" }}>{"─".repeat(38)}</div>
      <div style={{ textAlign: "center", marginTop: "6px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", marginBottom: "2px" }}>
          Merci de votre visite !
        </div>
        <div style={{ fontSize: "10px", opacity: 0.65, letterSpacing: "0.04em", marginBottom: "6px" }}>
          Conservez ce ticket comme preuve d&apos;achat
        </div>
        <div style={{ fontSize: "9px", opacity: 0.5 }}>Imprimé le {printedAt}</div>
      </div>
      <div style={{ textAlign: "center", fontSize: "11px", margin: "4px 0" }}>{"─".repeat(38)}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PosPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [amountGiven, setAmountGiven] = useState("");
  const [saleComplete, setSaleComplete] = useState(false);
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  const [currentTicket, setCurrentTicket] = useState({ number: "", date: "", time: "" });
  const [flashItem, setFlashItem] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const change = Math.max(0, Number(amountGiven) - total);

  // ─── Stock warnings ───────────────────────────────────────────────────────

  const stockWarnings = cart.filter(item => item.qty > item.stock);

  // ─── Catalog query ────────────────────────────────────────────────────────

  const { data: catalogData } = useQuery({
    queryKey: ["products-pos", search],
    queryFn: () =>
      productService
        .getAll(search ? { search } : undefined)
        .then(res => res.results),
    staleTime: 30_000,
  });

  const catalog: ApiProduct[] = catalogData ?? [];

  // ─── Sale mutation ────────────────────────────────────────────────────────

  const saleMutation = useMutation({
    mutationFn: (payload: SaleCreatePayload) => salesService.create(payload),
    onSuccess: (sale) => {
      const { date, time } = formatDateTime();
      setCurrentTicket({
        number: sale.invoice_number ?? `VTE-${sale.id}`,
        date,
        time,
      });
      setSaleComplete(true);
      toast({ title: `Vente enregistrée — ${sale.invoice_number ?? sale.id}` });
      sonnerToast.success(`Vente enregistrée — ${total.toLocaleString("fr-FR")} FCFA`, {
        description: `${cart.length} article(s) · Monnaie : ${change.toLocaleString("fr-FR")} FCFA`,
        duration: 4000,
      });
    },
    onError: () => {
      toast({
        title: "Erreur lors de la vente",
        description: "Stock insuffisant ou erreur serveur. Vérifiez les quantités.",
        variant: "destructive",
      });
      sonnerToast.error("Erreur lors de la vente", {
        description: "Stock insuffisant ou erreur serveur. Vérifiez les quantités.",
      });
    },
  });

  // ─── Print ────────────────────────────────────────────────────────────────

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: currentTicket.number,
  });

  // ─── Barcode scanner (USB keyboard emulation) ─────────────────────────────

  const addToCart = useCallback((product: ApiProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.selling_price,
          category: product.category_name,
          stock: product.stock_quantity,
          qty: 1,
          imageUrl: product.image_url,
        },
      ];
    });
    setFlashItem(product.id);
    setTimeout(() => setFlashItem(null), 600);
    setMobileTab("cart");

    if (product.stock_quantity < 1) {
      toast({
        title: "Stock insuffisant",
        description: `${product.name} est en rupture de stock.`,
        variant: "destructive",
      });
      sonnerToast.error("Stock insuffisant", {
        description: `${product.name} : stock insuffisant pour cette quantité.`,
      });
    } else if (product.stock_quantity <= 5) {
      sonnerToast.warning(`Stock bas — ${product.name}`, {
        description: `Il reste ${product.stock_quantity} unité(s) en stock.`,
        duration: 5000,
      });
    }
  }, []);

  useEffect(() => {
    let buffer = "";
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (showPayment || saleComplete) return;
      if (document.activeElement === searchRef.current) return;

      if (e.key === "Enter" && buffer.length > 3) {
        const code = buffer;
        buffer = "";
        try {
          const res = await productService.getByBarcode(code);
          addToCart(res);
        } catch {
          toast({
            title: "Produit non trouvé",
            description: `Code-barres : ${code}`,
            variant: "destructive",
          });
          sonnerToast.error("Produit non trouvé", {
            description: `Code-barres : ${code}`,
          });
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => { buffer = ""; }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [showPayment, saleComplete, addToCart]);

  // ─── Cart actions ─────────────────────────────────────────────────────────

  const updateQty = (id: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
        .filter(item => item.qty > 0)
    );
  };

  const removeItem = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // ─── Payment confirmation ─────────────────────────────────────────────────

  const handlePayment = () => {
    if (Number(amountGiven) < total) return;
    if (stockWarnings.length > 0) {
      toast({
        title: "Stock insuffisant",
        description: `Quantité demandée dépasse le stock disponible pour : ${stockWarnings.map(i => i.name).join(", ")}`,
        variant: "destructive",
      });
      sonnerToast.error("Stock insuffisant", {
        description: `Quantité demandée dépasse le stock disponible pour : ${stockWarnings.map(i => i.name).join(", ")}`,
      });
      return;
    }

    const payload: SaleCreatePayload = {
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        unit_price: item.price,
      })),
      payment_method: "cash",
      amount_paid: Number(amountGiven),
      client_id: null,
    };

    saleMutation.mutate(payload);
  };

  const resetSale = () => {
    setCart([]);
    setShowPayment(false);
    setAmountGiven("");
    setSaleComplete(false);
    setSearch("");
    setMobileTab("catalog");
    saleMutation.reset();
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000];

  // ─── Success screen ───────────────────────────────────────────────────────

  if (saleComplete) {
    return (
      <>
        <Topbar title="Point de vente" subtitle="Caisse rapide" onMenuClick={onMenuClick} />

        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 4mm; }
            body > * { display: none !important; }
            #receipt-printable { display: block !important; position: fixed; top: 0; left: 0; width: 72mm; }
          }
          #receipt-printable { display: none; }
        `}</style>

        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--muted))]/40 to-[hsl(var(--accent))]/10">
          <div className="w-full max-w-sm animate-slide-in">

            <div className="text-center mb-5">
              <div className="relative inline-flex mb-3">
                <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center ring-[6px] ring-success/10 shadow-lg shadow-success/10">
                  <CheckCircle className="w-10 h-10 text-success" strokeWidth={2.2} />
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-1">Vente enregistrée</h2>
              <p className="text-xs text-muted-foreground font-mono tracking-[0.2em]">{currentTicket.number}</p>
            </div>

            <div className="bg-gradient-to-br from-success/15 to-success/5 border border-success/25 rounded-2xl p-5 mb-5 text-center shadow-sm">
              <p className="text-[10px] font-bold text-success/80 uppercase tracking-[0.22em] mb-1.5">Monnaie à rendre</p>
              <p className="text-4xl font-black text-success tracking-tight tabular-nums">
                {change.toLocaleString()} <span className="text-2xl">FCFA</span>
              </p>
              <div className="flex justify-center gap-8 mt-4 text-xs text-muted-foreground pt-3 border-t border-success/15">
                <span>Total <span className="font-bold text-foreground tabular-nums">{total.toLocaleString()} F</span></span>
                <span>Reçu <span className="font-bold text-foreground tabular-nums">{Number(amountGiven).toLocaleString()} F</span></span>
              </div>
            </div>

            <div
              className="mb-5 overflow-hidden"
              style={{
                background: "#fff",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.06)",
                padding: "16px 18px",
                position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "6px",
                background: "repeating-linear-gradient(90deg, #fff 0px, #fff 5px, #f3f4f6 5px, #f3f4f6 10px)",
              }} />
              <div style={{ paddingTop: "8px" }}>
                <Receipt
                  items={cart}
                  total={total}
                  amountGiven={Number(amountGiven)}
                  change={change}
                  ticketNumber={currentTicket.number}
                  date={currentTicket.date}
                  time={currentTicket.time}
                />
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "6px",
                background: "repeating-linear-gradient(90deg, #fff 0px, #fff 5px, #f3f4f6 5px, #f3f4f6 10px)",
              }} />
            </div>

            <div ref={receiptRef} id="receipt-printable">
              <Receipt
                items={cart}
                total={total}
                amountGiven={Number(amountGiven)}
                change={change}
                ticketNumber={currentTicket.number}
                date={currentTicket.date}
                time={currentTicket.time}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2 h-12 font-semibold border-2"
                onClick={() => handlePrint()}
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </Button>
              <Button
                className="flex-1 h-12 font-bold shadow-md shadow-primary/20 bg-gradient-to-br from-primary to-primary/85 hover:from-primary/95 hover:to-primary/75"
                onClick={resetSale}
              >
                Nouvelle vente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Main POS screen ──────────────────────────────────────────────────────

  return (
    <>
      <Topbar title="Point de vente" subtitle="Scan code-barres ou recherche rapide" onMenuClick={onMenuClick} />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))]/30">

        {/* ── Mobile tabs ── */}
        <div className="flex md:hidden border-b shrink-0 bg-card/80 backdrop-blur-sm">
          <button
            onClick={() => setMobileTab("catalog")}
            className={cn(
              "flex-1 py-3.5 text-sm font-semibold transition-all min-h-[48px] relative",
              mobileTab === "catalog"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Catalogue
            {mobileTab === "catalog" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setMobileTab("cart")}
            className={cn(
              "flex-1 py-3.5 text-sm font-semibold transition-all relative min-h-[48px]",
              mobileTab === "cart"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="inline-flex items-center gap-2">
              Panier
              {totalItems > 0 && (
                <span className="inline-flex min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] items-center justify-center font-bold tabular-nums">
                  {totalItems}
                </span>
              )}
            </span>
            {mobileTab === "cart" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        </div>

        {/* ── Catalog panel ── */}
        <div
          className={cn(
            "flex flex-col min-w-0 md:flex-1 md:border-r border-[hsl(var(--border))]",
            mobileTab === "catalog" ? "flex flex-1 overflow-hidden" : "hidden md:flex"
          )}
        >
          {/* Premium search header */}
          <div className="p-4 md:p-5 border-b bg-card/60 backdrop-blur-sm shrink-0">
            <div className="relative group">
              {/* Subtle glow on focus */}
              <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-card border-2 border-[hsl(var(--border))] rounded-xl focus-within:border-primary/60 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
                <div className="flex items-center justify-center w-12 h-12 shrink-0">
                  <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  ref={searchRef}
                  placeholder="Rechercher un produit ou scanner…"
                  className="flex-1 h-12 border-0 bg-transparent text-[15px] font-medium placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold animate-pulse-soft">
                  <ScanLine className="w-3.5 h-3.5" />
                  <span className="tracking-wide">Scanner actif</span>
                </div>
              </div>
            </div>

            {/* Catalog meta */}
            <div className="hidden md:flex items-center justify-between mt-3 px-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary/70" />
                <span>{catalog.length} produit{catalog.length > 1 ? "s" : ""} disponible{catalog.length > 1 ? "s" : ""}</span>
              </div>
              <span className="font-mono tracking-wider opacity-70">CAISSE 01</span>
            </div>
          </div>

          {/* Catalog grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {catalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-foreground">Aucun produit trouvé</p>
                <p className="text-xs mt-1 max-w-[220px] text-center">
                  Essayez avec un autre mot-clé ou scannez un code-barres
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {catalog.map(product => {
                  const isOut = product.stock_quantity === 0;
                  const isLow = product.stock_quantity > 0 && product.stock_quantity <= 5;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={cn(
                        "group relative bg-card rounded-xl border border-[hsl(var(--border))] p-3 text-left",
                        "transition-all duration-200 ease-out",
                        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                        "active:scale-[0.97] active:translate-y-0",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        "min-h-[44px] cursor-pointer",
                        isOut && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none hover:border-[hsl(var(--border))]"
                      )}
                      disabled={isOut}
                      title={isOut ? "Rupture de stock" : product.name}
                    >
                      {/* Stock badge */}
                      {(isLow || isOut) && (
                        <span
                          className={cn(
                            "absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            isOut
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-warning/90 text-warning-foreground"
                          )}
                        >
                          {isOut ? "Rupture" : `${product.stock_quantity}`}
                        </span>
                      )}

                      {/* Icon / image placeholder */}
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-2.5 overflow-hidden group-hover:from-primary/10 group-hover:to-accent/5 transition-colors">
                        <div className="group-hover:scale-110 transition-transform duration-200">
                          <ProductIcon name={product.name} category={product.category_name} size="md" imageUrl={product.image_url} />
                        </div>
                      </div>

                      {/* Name */}
                      <p className="text-[13px] font-semibold leading-tight line-clamp-2 text-foreground mb-1.5 min-h-[32px]">
                        {product.name}
                      </p>

                      {/* Price row */}
                      <div className="flex items-baseline justify-between">
                        <span className="text-[15px] font-black text-primary tabular-nums leading-none">
                          {product.selling_price.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          FCFA
                        </span>
                      </div>

                      {/* Hover ring highlight */}
                      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-primary/0 group-hover:ring-primary/20 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart panel ── */}
        <div
          className={cn(
            "flex flex-col bg-card md:w-[420px] md:shrink-0 md:shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.08)]",
            mobileTab === "cart" ? "flex-1 overflow-hidden" : "hidden md:flex"
          )}
        >
          {/* Cart header */}
          <div className="px-4 md:px-5 py-4 border-b flex items-center justify-between shrink-0 bg-gradient-to-r from-[hsl(var(--sidebar-bg))] to-[hsl(var(--sidebar-bg))]/95 text-[hsl(var(--sidebar-fg-active))]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center ring-1 ring-primary/30">
                <ShoppingCart className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold tracking-tight">Caisse</span>
                  {totalItems > 0 && (
                    <span className="inline-flex min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] items-center justify-center font-bold tabular-nums">
                      {totalItems}
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-70 leading-tight tracking-wide">
                  {totalItems === 0 ? "Panier vide" : `${totalItems} article${totalItems > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] font-semibold uppercase tracking-wider opacity-70 hover:opacity-100 hover:text-destructive transition-all px-3 py-2 rounded-md hover:bg-white/5 min-h-[36px]"
              >
                Vider
              </button>
            )}
          </div>

          {/* Stock warnings banner */}
          {stockWarnings.length > 0 && (
            <div className="mx-3 md:mx-4 mt-3 rounded-lg border border-warning/40 bg-gradient-to-br from-warning/15 to-warning/5 px-3 py-2.5 flex items-start gap-2.5 text-[12px] text-[hsl(var(--warning-foreground))] shrink-0">
              <div className="w-7 h-7 rounded-md bg-warning/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-warning" strokeWidth={2.4} />
              </div>
              <div className="leading-snug pt-0.5">
                <p className="font-semibold mb-0.5">Stock insuffisant</p>
                <p className="opacity-80 text-[11px]">
                  {stockWarnings.map(i => `${i.name} (${i.stock})`).join(" · ")}
                </p>
              </div>
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16 px-6 text-center">
                <div className="relative mb-5">
                  {/* Outer decorative rings */}
                  <div className="absolute inset-0 rounded-full bg-primary/5 scale-[1.5] opacity-60" />
                  <div className="absolute inset-0 rounded-full bg-primary/8 scale-[1.25] opacity-40" />
                  {/* Main circle */}
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/12 to-accent/8 ring-2 ring-primary/15 flex items-center justify-center shadow-warm-sm">
                    <ShoppingCart className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
                    {/* Small sparkle accent */}
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-primary/20 flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-primary/60" />
                    </span>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground mb-1.5 tracking-tight">Panier vide</p>
                <p className="text-xs leading-relaxed max-w-[210px]">
                  Scannez ou cherchez un produit pour démarrer la vente
                </p>
              </div>
            ) : (
              <div className="p-1.5 md:p-2 space-y-1">
                {cart.map(item => {
                  const lineTotal = item.price * item.qty;
                  const hasWarning = item.qty > item.stock;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group rounded-lg border bg-card px-2.5 py-1.5 transition-all duration-200",
                        flashItem === item.id
                          ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10 scale-[1.005]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--border))]/80",
                        hasWarning && "border-warning/40 bg-warning/5"
                      )}
                    >
                      {/* Single compact row */}
                      <div className="flex items-center gap-2">
                        {/* Icon 32px */}
                        <div className="w-8 h-8 rounded-md bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                          <ProductIcon name={item.name} category={item.category} size="sm" imageUrl={item.imageUrl} />
                        </div>

                        {/* Name + unit price */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold leading-tight truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {item.price.toLocaleString()} F
                            </span>
                            {hasWarning && (
                              <span className="text-[10px] text-warning flex items-center gap-0.5 font-medium">
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" strokeWidth={2.4} />
                                max {item.stock}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stepper — 28px buttons on desktop */}
                        <div className="inline-flex items-center rounded-md border border-[hsl(var(--border))] bg-background overflow-hidden shrink-0">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-muted active:bg-muted/70 transition-colors border-r border-[hsl(var(--border))] touch-manipulation"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="w-3 h-3" strokeWidth={2.4} />
                          </button>
                          <span className="min-w-[28px] h-7 flex items-center justify-center text-[12px] font-bold tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-muted active:bg-muted/70 transition-colors border-l border-[hsl(var(--border))] touch-manipulation"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="w-3 h-3" strokeWidth={2.4} />
                          </button>
                        </div>

                        {/* Line total */}
                        <div className="text-right shrink-0 min-w-[56px]">
                          <p className="text-[13px] font-black tabular-nums text-foreground leading-tight">
                            {lineTotal.toLocaleString()} <span className="text-[9px] font-bold text-muted-foreground">F</span>
                          </p>
                        </div>

                        {/* Trash */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Retirer ${item.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart footer */}
          {cart.length > 0 && (
            <div className="border-t bg-card p-4 md:p-5 shrink-0 space-y-3.5">
              {!showPayment ? (
                <>
                  {/* Totals block */}
                  <div className="rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 p-4 border border-[hsl(var(--border))]">
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-1">
                      <span>{totalItems} article{totalItems > 1 ? "s" : ""}</span>
                      <span className="tabular-nums">{total.toLocaleString()} F</span>
                    </div>
                    <div className="h-px bg-[hsl(var(--border))] my-2" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Total</span>
                      <span className="text-[28px] font-black text-primary tabular-nums leading-none">
                        {total.toLocaleString()} <span className="text-sm">F</span>
                      </span>
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full h-14 text-[15px] font-bold rounded-xl",
                      "bg-gradient-to-br from-primary to-primary/85 hover:from-primary/95 hover:to-primary/75",
                      "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                      "active:scale-[0.98] transition-all"
                    )}
                    onClick={() => setShowPayment(true)}
                  >
                    <Banknote className="w-5 h-5 mr-2" strokeWidth={2.2} />
                    Encaisser · {total.toLocaleString()} F
                  </Button>
                </>
              ) : (
                <div className="animate-slide-in-right space-y-3.5">
                  {/* Total */}
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 p-4 border border-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-1">À payer</p>
                    <p key={total} className="text-[32px] font-black text-primary tabular-nums leading-none animate-count-up">
                      {total.toLocaleString()} <span className="text-lg">FCFA</span>
                    </p>
                  </div>

                  {/* Amount received */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Montant reçu
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={amountGiven}
                      onChange={e => setAmountGiven(e.target.value)}
                      className="mt-1.5 text-xl font-black h-14 tabular-nums tracking-tight border-2 focus-visible:border-primary/60 rounded-xl"
                      autoFocus
                    />
                  </div>

                  {/* Quick amounts */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                      Montant rapide
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickAmounts.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmountGiven(String(amt))}
                          className="min-h-[36px] px-3 py-1.5 text-[12px] rounded-lg border-2 border-[hsl(var(--border))] hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition-all font-bold tabular-nums"
                        >
                          {amt.toLocaleString()}
                        </button>
                      ))}
                      <button
                        onClick={() => setAmountGiven(String(total))}
                        className="min-h-[36px] px-3 py-1.5 text-[12px] rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-2 border-primary/20 active:scale-95 transition-all font-bold"
                      >
                        Exact
                      </button>
                    </div>
                  </div>

                  {/* Change */}
                  {Number(amountGiven) >= total && (
                    <div className="rounded-xl bg-gradient-to-br from-success/15 to-success/5 border border-success/30 p-3.5 text-center animate-fade-scale">
                      <p className="text-[10px] font-bold text-success/80 uppercase tracking-[0.2em] mb-0.5">
                        Monnaie à rendre
                      </p>
                      <p key={change} className="text-2xl font-black text-success tabular-nums leading-tight animate-count-up">
                        {change.toLocaleString()} <span className="text-base">FCFA</span>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setShowPayment(false)}
                      className="flex-1 h-12 border-2 font-semibold"
                      disabled={saleMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Retour
                    </Button>
                    <Button
                      onClick={handlePayment}
                      disabled={Number(amountGiven) < total || saleMutation.isPending || stockWarnings.length > 0}
                      className={cn(
                        "flex-[2] h-14 font-bold text-[15px] rounded-xl",
                        "bg-gradient-to-br from-accent to-accent/85 hover:from-accent/95 hover:to-accent/75",
                        "text-accent-foreground",
                        "shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30",
                        "active:scale-[0.98] transition-all",
                        "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
                      )}
                    >
                      {saleMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Enregistrement…
                        </span>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" strokeWidth={2.2} />
                          Valider la vente
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
