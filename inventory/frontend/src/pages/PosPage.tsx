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
  ShoppingBag,
  Package,
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
  const [newlyAdded, setNewlyAdded] = useState<Set<number>>(new Set());
  const [removing, setRemoving] = useState<Set<number>>(new Set());

  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const subtotal = total;
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
    pageStyle: `
      @page { size: 80mm auto; margin: 3mm; }
      body { margin: 0; font-family: monospace; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
    onAfterPrint: resetSale,
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
    // Entrance animation: mark as newly added then remove after 300ms
    setNewlyAdded(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setNewlyAdded(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 300);
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
    setRemoving(prev => new Set(prev).add(id));
    setTimeout(() => {
      setCart(prev => prev.filter(item => item.id !== id));
      setRemoving(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
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

  function resetSale() {
    setCart([]);
    setShowPayment(false);
    setAmountGiven("");
    setSaleComplete(false);
    setSearch("");
    setMobileTab("catalog");
    saleMutation.reset();
  }

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000];

  // ─── Success screen ───────────────────────────────────────────────────────

  if (saleComplete) {
    return (
      <>
        <Topbar title="Point de vente" subtitle="Caisse rapide" onMenuClick={onMenuClick} />

        <div
          className="flex-1 flex items-center justify-center p-4 overflow-y-auto"
          style={{
            background: "radial-gradient(ellipse at 30% 20%, hsl(22 72% 48% / 0.08) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, hsl(38 88% 55% / 0.06) 0%, transparent 50%), hsl(var(--background))",
          }}
        >
          <div
            className="w-full max-w-sm"
            style={{
              animation: "pos-success-in 350ms ease-out both",
            }}
          >

            <div className="text-center mb-5">
              <div className="relative inline-flex mb-3">
                <div
                  className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center ring-[6px] ring-success/10"
                  style={{ boxShadow: "0 8px 32px hsl(152 60% 40% / 0.35), 0 4px 12px hsl(152 60% 40% / 0.2)" }}
                >
                  <CheckCircle
                    className="w-10 h-10 text-success"
                    strokeWidth={2.2}
                    style={{ filter: "drop-shadow(0 2px 8px hsl(152 60% 40% / 0.5))" }}
                  />
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
                background: "hsl(var(--card))",
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                boxShadow: "var(--shadow-md)",
                padding: "16px 18px",
                position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "6px",
                background: "repeating-linear-gradient(90deg, hsl(var(--card)) 0px, hsl(var(--card)) 5px, hsl(var(--muted)) 5px, hsl(var(--muted)) 10px)",
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
                background: "repeating-linear-gradient(90deg, hsl(var(--card)) 0px, hsl(var(--card)) 5px, hsl(var(--muted)) 5px, hsl(var(--muted)) 10px)",
              }} />
            </div>

            <div ref={receiptRef} style={{ display: "none" }}>
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

      {/* ── Main split layout ── */}
      <div className="flex h-[calc(100vh-var(--topbar-h,64px)-var(--mobiletab-h,0px))] md:h-[calc(100vh-64px)] overflow-hidden">

        {/* ── LEFT — Catalogue ── */}
        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden border-r border-border bg-background",
            mobileTab === "catalog" ? "flex" : "hidden md:flex"
          )}
        >
          {/* Search bar */}
          <div className="p-4 border-b shrink-0" style={{ background: "hsl(var(--card))" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                placeholder="Rechercher un produit ou scanner un code-barres..."
                className="w-full pl-10 pr-24 py-3 text-sm font-medium outline-none transition-all text-foreground placeholder:text-muted-foreground/60"
                style={{
                  borderRadius: "12px",
                  background: "hsl(var(--card))",
                  border: "1.5px solid hsl(var(--border))",
                  boxShadow: "var(--shadow-sm)",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "hsl(22 72% 48%)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px hsl(22 72% 48% / 0.2)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "hsl(var(--border))";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md"
                   style={{ background: "hsl(22 72% 48% / 0.1)" }}>
                <ScanLine className="w-3.5 h-3.5" style={{ color: "hsl(22 72% 48%)" }} />
                <span className="text-[10px] font-semibold tracking-wide" style={{ color: "hsl(22 72% 48%)" }}>
                  Scanner actif
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="hidden md:flex items-center justify-between mt-2.5 px-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: "hsl(22 72% 48% / 0.7)" }} />
                <span>{catalog.length} produit{catalog.length !== 1 ? "s" : ""} disponible{catalog.length !== 1 ? "s" : ""}</span>
              </div>
              <span className="font-mono tracking-wider opacity-60">CAISSE 01</span>
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {catalog.map((product, index) => {
                  const isOut = product.stock_quantity === 0;
                  const isLow = product.stock_quantity > 0 && product.stock_quantity <= 5;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOut}
                      title={isOut ? "Rupture de stock" : product.name}
                      className={cn(
                        "group relative rounded-xl p-3 text-left cursor-pointer transition-all duration-200 animate-slide-in",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97]",
                        isOut
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      )}
                      style={{
                        background: "hsl(var(--card))",
                        borderRadius: "16px",
                        borderTop: "none",
                        borderLeft: "none",
                        borderBottom: "1.5px solid hsl(var(--border))",
                        borderRight: "1.5px solid hsl(var(--border))",
                        boxShadow: "0 1px 3px hsl(22 30% 15% / 0.06)",
                        animationDelay: `${index * 40}ms`,
                      }}
                      onMouseEnter={e => {
                        if (isOut) return;
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderBottomColor = "hsl(22 72% 48% / 0.45)";
                        e.currentTarget.style.borderRightColor = "hsl(22 72% 48% / 0.45)";
                        e.currentTarget.style.boxShadow = "0 8px 24px hsl(22 30% 15% / 0.1)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderBottomColor = "hsl(var(--border))";
                        e.currentTarget.style.borderRightColor = "hsl(var(--border))";
                        e.currentTarget.style.boxShadow = "0 1px 3px hsl(22 30% 15% / 0.06)";
                      }}
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

                      {/* Image / icon */}
                      <div
                        className="w-full aspect-square rounded-lg mb-2.5 overflow-hidden flex items-center justify-center transition-colors"
                        style={{ background: "hsl(var(--muted))" }}
                      >
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="group-hover:scale-110 transition-transform duration-200">
                            <ProductIcon name={product.name} category={product.category_name} size="md" imageUrl={product.image_url} />
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <p className="text-[13px] font-semibold leading-tight line-clamp-2 text-foreground mb-1 min-h-[32px]">
                        {product.name}
                      </p>

                      {/* Stock count */}
                      {!isOut && !isLow && (
                        <p className="text-[10px] text-muted-foreground mb-1.5">
                          Stock : {product.stock_quantity}
                        </p>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline justify-between">
                        <span
                          className="text-[15px] font-black tabular-nums leading-none"
                          style={{
                            fontFamily: "Fraunces, Georgia, serif",
                            background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 58%), hsl(22 60% 52%))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {product.selling_price.toLocaleString("fr-FR")}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          FCFA
                        </span>
                      </div>

                      {/* Add overlay on hover */}
                      {!isOut && (
                        <div
                          className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "hsl(22 72% 48% / 0.06)" }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: "hsl(22 72% 48%)", color: "white" }}
                          >
                            <Plus className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT — Ticket / Cart ── */}
        <div
          className={cn(
            "flex flex-col md:w-[380px] md:shrink-0",
            mobileTab === "cart" ? "flex-1" : "hidden md:flex"
          )}
          style={{
            background: "hsl(var(--sidebar-bg))",
            position: "relative",
          }}
        >
          {/* Noise texture overlay */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "128px 128px",
              opacity: 0.03,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {/* Ticket header */}
          <div
            className="p-5 shrink-0"
            style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(22 72% 48% / 0.2)", border: "1px solid hsl(22 72% 48% / 0.3)" }}
                >
                  <ShoppingCart className="w-4 h-4" style={{ color: "hsl(22 72% 65%)" }} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-tight">Ticket en cours</h2>
                  <p className="text-[11px]" style={{ color: "hsl(var(--sidebar-fg) / 0.55)" }}>
                    {totalItems === 0 ? "Panier vide" : `${totalItems} article${totalItems > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs font-semibold uppercase tracking-wider transition-all px-3 py-1.5 rounded-lg"
                  style={{
                    color: "hsl(var(--sidebar-fg) / 0.5)",
                    background: "transparent",
                    border: "1px solid hsl(var(--sidebar-border))",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "rgba(239,68,68,0.9)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                    e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "hsl(var(--sidebar-fg) / 0.5)";
                    e.currentTarget.style.borderColor = "hsl(var(--sidebar-border))";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Vider
                </button>
              )}
            </div>
          </div>

          {/* Stock warnings */}
          {stockWarnings.length > 0 && (
            <div
              className="mx-4 mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2.5 shrink-0"
              style={{
                background: "hsl(38 92% 50% / 0.12)",
                border: "1px solid hsl(38 92% 50% / 0.3)",
              }}
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "hsl(38 92% 60%)" }} />
              <div className="text-[11px] leading-snug" style={{ color: "hsl(38 92% 70%)" }}>
                <p className="font-semibold mb-0.5">Stock insuffisant</p>
                <p style={{ color: "hsl(38 92% 60% / 0.8)" }}>
                  {stockWarnings.map(i => `${i.name} (${i.stock})`).join(" · ")}
                </p>
              </div>
            </div>
          )}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "hsl(var(--sidebar-border) / 0.35)", border: "1px solid hsl(var(--sidebar-border))" }}
                >
                  <Package className="w-9 h-9" style={{ color: "hsl(var(--sidebar-fg) / 0.35)" }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "hsl(var(--sidebar-fg))" }}>
                  Ticket vide
                </p>
                <p className="text-xs leading-relaxed max-w-[200px]" style={{ color: "hsl(var(--sidebar-fg) / 0.45)" }}>
                  Scannez ou sélectionnez un produit pour démarrer
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map(item => {
                  const lineTotal = item.price * item.qty;
                  const hasWarning = item.qty > item.stock;
                  const isNew = newlyAdded.has(item.id);
                  const isRemoving = removing.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group flex items-center gap-3 p-3 rounded-xl",
                        flashItem === item.id && "scale-[1.01]"
                      )}
                      style={{
                        background: flashItem === item.id
                          ? "hsl(22 72% 48% / 0.15)"
                          : hasWarning
                          ? "rgba(234,179,8,0.08)"
                          : "hsl(var(--sidebar-border) / 0.3)",
                        border: flashItem === item.id
                          ? "1px solid hsl(22 72% 48% / 0.4)"
                          : hasWarning
                          ? "1px solid rgba(234,179,8,0.25)"
                          : "1px solid hsl(var(--sidebar-border))",
                        transition: "opacity 200ms ease-out, transform 200ms ease-out, background 200ms ease, border-color 200ms ease",
                        opacity: isRemoving ? 0 : 1,
                        transform: isNew
                          ? "translateX(0)"
                          : isRemoving
                          ? "translateX(12px)"
                          : "translateX(0)",
                        ...(isNew && {
                          animation: "pos-cart-in 250ms ease-out both",
                        }),
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
                        style={{ background: "hsl(var(--sidebar-border) / 0.5)" }}
                      >
                        <ProductIcon name={item.name} category={item.category} size="sm" imageUrl={item.imageUrl} />
                      </div>

                      {/* Name + price */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] tabular-nums" style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}>
                            {item.price.toLocaleString("fr-FR")} F
                          </span>
                          {hasWarning && (
                            <span className="text-[10px] flex items-center gap-0.5 font-medium" style={{ color: "hsl(38 92% 60%)" }}>
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                              max {item.stock}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-all touch-manipulation"
                          style={{ background: "hsl(var(--sidebar-border) / 0.5)", color: "hsl(var(--sidebar-fg))" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--sidebar-border))"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "hsl(var(--sidebar-border) / 0.5)"; e.currentTarget.style.color = "hsl(var(--sidebar-fg))"; }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center tabular-nums" style={{ color: "hsl(var(--sidebar-fg-active))" }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-all touch-manipulation"
                          style={{ background: "hsl(var(--sidebar-border) / 0.5)", color: "hsl(var(--sidebar-fg))" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--sidebar-border))"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "hsl(var(--sidebar-border) / 0.5)"; e.currentTarget.style.color = "hsl(var(--sidebar-fg))"; }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line total */}
                      <p
                        className="text-xs font-bold w-16 text-right shrink-0 tabular-nums"
                        style={{ fontFamily: "Fraunces, Georgia, serif", color: "hsl(var(--sidebar-fg-active))" }}
                      >
                        {lineTotal.toLocaleString("fr-FR")}
                      </p>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                        style={{ color: "rgba(239,68,68,0.6)" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "rgba(239,68,68,1)"; e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(239,68,68,0.6)"; e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer — total + payment */}
          {cart.length > 0 && (
            <div
              className="p-5 shrink-0"
              style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
            >
              {!showPayment ? (
                <>
                  {/* Sous-total */}
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: "hsl(var(--sidebar-fg) / 0.55)" }}>Sous-total</span>
                    <span
                      className="font-medium tabular-nums"
                      style={{ fontFamily: "Fraunces, Georgia, serif", color: "hsl(var(--sidebar-fg))" }}
                    >
                      {subtotal.toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>

                  {/* Divider */}
                  <div
                    className="my-3"
                    style={{
                      height: "1px",
                      border: "none",
                      background: "linear-gradient(90deg, transparent, hsl(22 72% 48% / 0.3), transparent)",
                    }}
                  />

                  {/* Total */}
                  <div className="flex justify-between items-center mb-5">
                    <span className="font-bold text-lg" style={{ color: "hsl(var(--sidebar-fg-active))" }}>Total</span>
                    <span
                      className="font-black tabular-nums leading-none"
                      style={{
                        fontFamily: "Fraunces, Georgia, serif",
                        fontSize: "clamp(2rem, 4vw, 2.8rem)",
                        letterSpacing: "-0.03em",
                        background: "linear-gradient(135deg, hsl(22 72% 65%), hsl(36 88% 72%))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {total.toLocaleString("fr-FR")} <span style={{ fontSize: "1.1rem" }}>FCFA</span>
                    </span>
                  </div>

                  {/* Valider button */}
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                      boxShadow: "0 8px 24px hsl(22 72% 48% / 0.4), 0 4px 8px hsl(22 72% 48% / 0.2)",
                      color: "white",
                      border: "none",
                      borderRadius: "14px",
                      padding: "16px 24px",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      letterSpacing: "0.01em",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "box-shadow 200ms ease, transform 200ms ease",
                      animation: cart.length > 0 ? "pulse-subtle 2s ease-in-out infinite" : "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 32px hsl(22 72% 48% / 0.55), 0 6px 12px hsl(22 72% 48% / 0.3)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.animationPlayState = "paused"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 8px 24px hsl(22 72% 48% / 0.4), 0 4px 8px hsl(22 72% 48% / 0.2)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.animationPlayState = "running"; }}
                  >
                    <Banknote className="w-5 h-5" />
                    Encaisser · {total.toLocaleString("fr-FR")} F
                  </button>
                </>
              ) : (
                <div className="space-y-3.5 animate-slide-in">
                  {/* À payer */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "hsl(22 72% 48% / 0.12)",
                      border: "1px solid hsl(22 72% 48% / 0.25)",
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "hsl(22 72% 65% / 0.8)" }}>
                      À payer
                    </p>
                    <p
                      className="text-[32px] font-black tabular-nums leading-none"
                      style={{
                        fontFamily: "Fraunces, Georgia, serif",
                        background: "linear-gradient(135deg, hsl(22 72% 65%), hsl(36 88% 72%))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {total.toLocaleString("fr-FR")} <span style={{ fontSize: "1.25rem" }}>FCFA</span>
                    </p>
                  </div>

                  {/* Montant reçu */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "hsl(var(--sidebar-fg) / 0.55)" }}>
                      Montant reçu
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={amountGiven}
                      onChange={e => setAmountGiven(e.target.value)}
                      className="mt-1.5 text-xl font-black h-14 tabular-nums tracking-tight border-2 bg-white/10 text-white border-white/20 focus-visible:border-[hsl(22_72%_48%)] focus-visible:ring-0"
                      style={{ borderRadius: "12px" }}
                      onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 3px hsl(22 72% 48% / 0.2)"; }}
                      onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
                      autoFocus
                    />
                  </div>

                  {/* Montants rapides */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5" style={{ color: "hsl(var(--sidebar-fg) / 0.45)" }}>
                      Montant rapide
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickAmounts.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmountGiven(String(amt))}
                          className="min-h-[34px] px-2.5 py-1 text-[11px] rounded-lg transition-all font-bold tabular-nums active:scale-95"
                          style={{
                            color: "hsl(var(--sidebar-fg))",
                            background: "hsl(var(--sidebar-border) / 0.4)",
                            border: "1px solid hsl(var(--sidebar-border))",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = "white";
                            e.currentTarget.style.borderColor = "hsl(22 72% 48% / 0.5)";
                            e.currentTarget.style.background = "hsl(22 72% 48% / 0.15)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = "hsl(var(--sidebar-fg))";
                            e.currentTarget.style.borderColor = "hsl(var(--sidebar-border))";
                            e.currentTarget.style.background = "hsl(var(--sidebar-border) / 0.4)";
                          }}
                        >
                          {amt.toLocaleString("fr-FR")}
                        </button>
                      ))}
                      <button
                        onClick={() => setAmountGiven(String(total))}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] rounded-lg transition-all font-bold active:scale-95"
                        style={{
                          color: "hsl(22 72% 65%)",
                          background: "hsl(22 72% 48% / 0.15)",
                          border: "1px solid hsl(22 72% 48% / 0.35)",
                        }}
                      >
                        Exact
                      </button>
                    </div>
                  </div>

                  {/* Monnaie à rendre */}
                  {Number(amountGiven) >= total && (
                    <div
                      className="rounded-xl p-3.5 text-center"
                      style={{
                        background: "hsl(152 38% 38% / 0.15)",
                        border: "1px solid hsl(152 38% 38% / 0.3)",
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: "hsl(152 38% 60% / 0.8)" }}>
                        Monnaie à rendre
                      </p>
                      <p
                        className="text-2xl font-black tabular-nums leading-tight"
                        style={{ fontFamily: "Fraunces, Georgia, serif", color: "hsl(152 38% 65%)" }}
                      >
                        {change.toLocaleString("fr-FR")} <span style={{ fontSize: "1rem" }}>FCFA</span>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowPayment(false)}
                      disabled={saleMutation.isPending}
                      className="flex-1 h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{
                        color: "hsl(var(--sidebar-fg))",
                        background: "hsl(var(--sidebar-border) / 0.4)",
                        border: "1px solid hsl(var(--sidebar-border))",
                      }}
                    >
                      <X className="w-4 h-4" />
                      Retour
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={Number(amountGiven) < total || saleMutation.isPending || stockWarnings.length > 0}
                      className="flex-[2] h-14 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, hsl(152 38% 38%), hsl(152 38% 32%))",
                        color: "white",
                        border: "none",
                        boxShadow: Number(amountGiven) >= total ? "0 4px 20px hsl(152 38% 38% / 0.45)" : "none",
                      }}
                    >
                      {saleMutation.isPending ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Enregistrement…
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-5 h-5" />
                          Valider la vente
                        </>
                      )}
                    </button>
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
