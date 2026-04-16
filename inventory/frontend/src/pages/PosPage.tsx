import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, CheckCircle, X, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductIcon } from "@/components/ui/ProductIcon";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  qty: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTicketNumber(n: number): string {
  const year = new Date().getFullYear();
  const seq = String(n).padStart(4, "0");
  return `TKT-${year}-${seq}`;
}

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

  // Column widths for the items table (monospace, 40-char wide)
  // Format: NAME (left, 18) | QTY (right, 3) | P.U (right, 8) | TOTAL (right, 9)
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

const catalog: Product[] = [
  { id: 1, name: "Lait Nido 400g", barcode: "6001068002802", price: 3500, category: "Alimentaire" },
  { id: 2, name: "Huile Dinor 1L", barcode: "6001068002819", price: 2500, category: "Alimentaire" },
  { id: 3, name: "Riz Uncle Ben's 5kg", barcode: "6001068002826", price: 8000, category: "Alimentaire" },
  { id: 4, name: "Coca-Cola 1.5L", barcode: "5449000000996", price: 1200, category: "Boissons" },
  { id: 5, name: "Savon Palmolive", barcode: "8714789763378", price: 800, category: "Hygiène" },
  { id: 6, name: "Pâtes Panzani 500g", barcode: "3038350012005", price: 1500, category: "Alimentaire" },
  { id: 7, name: "Sucre en poudre 1kg", barcode: "3256220010015", price: 1000, category: "Alimentaire" },
  { id: 8, name: "Eau Tangui 1.5L", barcode: "6291041500213", price: 500, category: "Boissons" },
  { id: 9, name: "Biscuits Belvita", barcode: "7622300689421", price: 1800, category: "Alimentaire" },
  { id: 10, name: "Détergent Omo 1kg", barcode: "8717163711040", price: 3200, category: "Entretien" },
  { id: 11, name: "Mayonnaise 500ml", barcode: "3250390003120", price: 2200, category: "Alimentaire" },
  { id: 12, name: "Tomate concentrée", barcode: "8005250020116", price: 900, category: "Alimentaire" },
];

export default function PosPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [amountGiven, setAmountGiven] = useState("");
  const [saleComplete, setSaleComplete] = useState(false);
  // Mobile tab: "catalog" | "cart"
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  // Compteur auto des tickets — persisté en mémoire pendant la session
  const [ticketCounter, setTicketCounter] = useState(1);
  const [currentTicket, setCurrentTicket] = useState({ number: "", date: "", time: "" });
  const [flashItem, setFlashItem] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const change = Math.max(0, Number(amountGiven) - total);

  // Impression via react-to-print
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: currentTicket.number,
  });

  // Barcode scanner: intercepts keyboard input
  useEffect(() => {
    let buffer = "";
    let timeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPayment || saleComplete) return;
      if (document.activeElement === searchRef.current) return;

      if (e.key === "Enter" && buffer.length > 3) {
        const found = catalog.find(p => p.barcode === buffer);
        if (found) addToCart(found);
        buffer = "";
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
  }, [showPayment, saleComplete, cart]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setFlashItem(product.id);
    setTimeout(() => setFlashItem(null), 600);
    // On mobile, switch to cart tab when item added
    setMobileTab("cart");
  }, []);

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

  const handlePayment = () => {
    if (Number(amountGiven) >= total) {
      const { date, time } = formatDateTime();
      setCurrentTicket({
        number: formatTicketNumber(ticketCounter),
        date,
        time,
      });
      setTicketCounter(prev => prev + 1);
      setSaleComplete(true);
    }
  };

  const resetSale = () => {
    setCart([]);
    setShowPayment(false);
    setAmountGiven("");
    setSaleComplete(false);
    setSearch("");
    setMobileTab("catalog");
  };

  const filtered = catalog.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000];

  if (saleComplete) {
    return (
      <>
        <Topbar title="Point de vente" subtitle="Caisse rapide" onMenuClick={onMenuClick} />

        {/* CSS impression : seule la zone du ticket est imprimée */}
        <style>{`
          @media print {
            @page { size: 80mm auto; margin: 4mm; }
            body > * { display: none !important; }
            #receipt-printable { display: block !important; position: fixed; top: 0; left: 0; width: 72mm; }
          }
          #receipt-printable { display: none; }
        `}</style>

        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto bg-muted/30">
          <div className="w-full max-w-sm animate-slide-in">

            {/* Confirmation banner */}
            <div className="text-center mb-5">
              <div className="relative inline-flex mb-3">
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center ring-4 ring-success/10">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-0.5">Vente enregistrée</h2>
              <p className="text-xs text-muted-foreground font-mono tracking-widest">{currentTicket.number}</p>
            </div>

            {/* Monnaie pill — big and clear for the cashier */}
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 text-center">
              <p className="text-xs font-medium text-success/80 uppercase tracking-widest mb-1">Monnaie à rendre</p>
              <p className="text-3xl font-black text-success tracking-tight">{change.toLocaleString()} FCFA</p>
              <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
                <span>Total <span className="font-semibold text-foreground">{total.toLocaleString()} F</span></span>
                <span>Reçu <span className="font-semibold text-foreground">{Number(amountGiven).toLocaleString()} F</span></span>
              </div>
            </div>

            {/* Ticket preview — styled like a real thermique printout on screen */}
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
              {/* Torn-edge top effect */}
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
              {/* Torn-edge bottom effect */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "6px",
                background: "repeating-linear-gradient(90deg, #fff 0px, #fff 5px, #f3f4f6 5px, #f3f4f6 10px)",
              }} />
            </div>

            {/* Zone réservée à l'impression (masquée à l'écran) */}
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

            {/* Boutons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2 h-11" onClick={() => handlePrint()}>
                <Printer className="w-4 h-4" />
                Imprimer
              </Button>
              <Button className="flex-1 h-11 font-semibold" onClick={resetSale}>
                Nouvelle vente
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Point de vente" subtitle="Scan code-barres ou recherche rapide" onMenuClick={onMenuClick} />

      {/*
        Layout:
        - Mobile (< md): stacked with tabs to switch between catalog and cart
        - Desktop (md+): side-by-side (catalog left, cart right)
      */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ── Mobile tabs ── */}
        <div className="flex md:hidden border-b shrink-0">
          <button
            onClick={() => setMobileTab("catalog")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors min-h-[44px]",
              mobileTab === "catalog"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            )}
          >
            Catalogue
          </button>
          <button
            onClick={() => setMobileTab("cart")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative min-h-[44px]",
              mobileTab === "cart"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            )}
          >
            Panier
            {totalItems > 0 && (
              <span className="ml-1.5 inline-flex w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] items-center justify-center font-semibold">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* ── Catalog panel ── */}
        <div
          className={cn(
            "flex flex-col min-w-0 md:flex-1 md:border-r",
            // Mobile: show only when catalog tab active, fill remaining height
            mobileTab === "catalog" ? "flex flex-1 overflow-hidden" : "hidden md:flex"
          )}
        >
          <div className="p-4 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Rechercher ou scanner..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-card rounded-lg border p-3 text-left hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.97]"
                >
                  <div className="mb-2">
                    <ProductIcon name={product.name} category={product.category} size="md" />
                  </div>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-sm font-semibold mt-1 text-primary">{product.price.toLocaleString()} F</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Cart panel ── */}
        <div
          className={cn(
            "flex flex-col bg-card md:w-[380px] md:shrink-0",
            // Mobile: show only when cart tab active, fill remaining height
            mobileTab === "cart" ? "flex-1 overflow-hidden" : "hidden md:flex"
          )}
        >
          {/* Cart header */}
          <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-semibold">Panier</span>
              {totalItems > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-semibold">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive">
                Vider
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Panier vide</p>
                <p className="text-xs">Scannez ou sélectionnez des produits</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      "px-4 py-3 flex items-center gap-3 transition-colors duration-300",
                      flashItem === item.id && "bg-primary/10"
                    )}
                  >
                    <ProductIcon name={item.name} category={item.category} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.price.toLocaleString()} F × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{(item.price * item.qty).toLocaleString()} F</p>
                      <button onClick={() => removeItem(item.id)} className="mt-0.5">
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer */}
          {cart.length > 0 && (
            <div className="border-t p-4 space-y-3 shrink-0">
              {!showPayment ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total ({totalItems} articles)</span>
                    <span className="text-xl font-bold transition-all duration-200">{total.toLocaleString()} F</span>
                  </div>
                  <Button className="w-full h-12 text-base" onClick={() => setShowPayment(true)}>
                    <Banknote className="w-5 h-5 mr-2" />
                    Encaisser
                  </Button>
                </>
              ) : (
                <div className="animate-slide-in space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total à payer</span>
                    <span className="text-lg font-bold">{total.toLocaleString()} F</span>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Montant reçu</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amountGiven}
                      onChange={e => setAmountGiven(e.target.value)}
                      className="mt-1 text-lg font-semibold h-12"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {quickAmounts.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setAmountGiven(String(amt))}
                        className="px-2.5 py-1 text-xs rounded-md border hover:bg-secondary transition-colors font-medium"
                      >
                        {amt.toLocaleString()}
                      </button>
                    ))}
                    <button
                      onClick={() => setAmountGiven(String(total))}
                      className="px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      Exact
                    </button>
                  </div>

                  {Number(amountGiven) >= total && (
                    <div className="bg-success/10 rounded-md p-3 text-center">
                      <p className="text-xs text-muted-foreground">Monnaie à rendre</p>
                      <p className="text-lg font-bold text-success">{change.toLocaleString()} FCFA</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1">
                      <X className="w-4 h-4 mr-1" />
                      Retour
                    </Button>
                    <Button
                      onClick={handlePayment}
                      disabled={Number(amountGiven) < total}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Valider
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
