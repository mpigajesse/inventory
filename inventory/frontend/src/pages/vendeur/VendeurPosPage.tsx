import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
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
  User,
  ScanLine,
  ChevronRight,
} from "lucide-react";
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

      <div style={{ display: "flex", fontWeight: "700", fontSize: "10.5px", letterSpacing: "0.06em", margin: "4px 0 2px" }}>
        <span style={{ flex: "0 0 auto", width: `${COL_NAME}ch` }}>DÉSIGNATION</span>
        <span style={{ flex: "0 0 auto", width: `${COL_QTY}ch`, textAlign: "right" }}>QT</span>
        <span style={{ flex: "0 0 auto", width: `${COL_PU}ch`, textAlign: "right" }}>P.U.</span>
        <span style={{ flex: "1", textAlign: "right" }}>TOTAL</span>
      </div>
      <div style={{ fontSize: "11px", margin: "1px 0 4px" }}>{"─".repeat(38)}</div>

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

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
        <span style={{ opacity: 0.7 }}>Sous-total HT</span>
        <span>{fmtPrice(subtotal)} FCFA</span>
      </div>

      <div style={{ fontSize: "11px", margin: "4px 0" }}>{"═".repeat(38)}</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 0 6px" }}>
        <span style={{ fontSize: "13px", fontWeight: "900", letterSpacing: "0.1em" }}>TOTAL</span>
        <span style={{ fontSize: "15px", fontWeight: "900", letterSpacing: "0.04em" }}>
          {fmtPrice(total)} FCFA
        </span>
      </div>

      <div style={{ fontSize: "11px", margin: "2px 0 6px" }}>{"─".repeat(38)}</div>

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

// ─── Catalog mock data ────────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VendeurPosPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [amountGiven, setAmountGiven] = useState("");
  const [saleComplete, setSaleComplete] = useState(false);
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  const [ticketCounter, setTicketCounter] = useState(1);
  const [currentTicket, setCurrentTicket] = useState({ number: "", date: "", time: "" });
  const [flashItem, setFlashItem] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const change = Math.max(0, Number(amountGiven) - total);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: currentTicket.number,
  });

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
    setMobileTab("cart");
  }, []);

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
  }, [showPayment, saleComplete, addToCart]);

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

  // ─── Success screen ───────────────────────────────────────────────────────

  if (saleComplete) {
    return (
      <>
        <Topbar title="Caisse" subtitle="Espace vendeur" onMenuClick={onMenuClick} />

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
                className="flex-1 gap-2 h-14 font-semibold border-2 text-[15px]"
                onClick={() => handlePrint()}
              >
                <Printer className="w-5 h-5" />
                Imprimer
              </Button>
              <Button
                className="flex-1 h-14 font-bold text-[15px] shadow-md shadow-primary/20 bg-gradient-to-br from-primary to-primary/85 hover:from-primary/95 hover:to-primary/75"
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
      <Topbar title="Caisse" subtitle="Espace vendeur" onMenuClick={onMenuClick} />

      {/* Bandeau vendeur premium */}
      <div className="shrink-0 px-4 md:px-5 py-2.5 border-b bg-gradient-to-r from-primary/8 via-primary/5 to-accent/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/20">
          <User className="w-4 h-4" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold leading-none">Vendeur</p>
          <p className="text-sm font-bold text-foreground truncate">Marie Vendeur</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/15 text-success text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="tracking-wide">En session</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--muted))]/30">

        {/* Mobile tabs */}
        <div className="flex md:hidden border-b shrink-0 bg-card/80 backdrop-blur-sm">
          <button
            onClick={() => setMobileTab("catalog")}
            className={cn(
              "flex-1 py-4 text-[15px] font-semibold transition-all min-h-[52px] relative",
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
              "flex-1 py-4 text-[15px] font-semibold transition-all relative min-h-[52px]",
              mobileTab === "cart"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="inline-flex items-center gap-2">
              Panier
              {totalItems > 0 && (
                <span className="inline-flex min-w-[24px] h-[24px] px-1.5 rounded-full bg-primary text-primary-foreground text-[12px] items-center justify-center font-bold tabular-nums">
                  {totalItems}
                </span>
              )}
            </span>
            {mobileTab === "cart" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        </div>

        {/* Catalog panel */}
        <div
          className={cn(
            "flex flex-col min-w-0 md:flex-1 md:border-r border-[hsl(var(--border))]",
            mobileTab === "catalog" ? "flex flex-1 overflow-hidden" : "hidden md:flex"
          )}
        >
          {/* Premium search header */}
          <div className="p-4 md:p-5 border-b bg-card/60 backdrop-blur-sm shrink-0">
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-card border-2 border-[hsl(var(--border))] rounded-xl focus-within:border-primary/60 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
                <div className="flex items-center justify-center w-14 h-14 shrink-0">
                  <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  ref={searchRef}
                  placeholder="Rechercher ou scanner un produit…"
                  className="flex-1 h-14 border-0 bg-transparent text-base font-medium placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                  <ScanLine className="w-3.5 h-3.5" />
                  <span className="tracking-wide">Scanner prêt</span>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {filtered.length === 0 ? (
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
                {filtered.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={cn(
                      "group relative bg-card rounded-xl border border-[hsl(var(--border))] p-3 text-left",
                      "transition-all duration-200 ease-out",
                      "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
                      "active:scale-[0.97] active:translate-y-0",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      "min-h-[44px] cursor-pointer"
                    )}
                    title={product.name}
                  >
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-2.5 overflow-hidden group-hover:from-primary/10 group-hover:to-accent/5 transition-colors">
                      <ProductIcon name={product.name} category={product.category} size="md" />
                    </div>

                    <p className="text-[13px] font-semibold leading-tight line-clamp-2 text-foreground mb-1.5 min-h-[32px]">
                      {product.name}
                    </p>

                    <div className="flex items-baseline justify-between">
                      <span className="text-[15px] font-black text-primary tabular-nums leading-none">
                        {product.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        FCFA
                      </span>
                    </div>

                    <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-primary/0 group-hover:ring-primary/20 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <div
          className={cn(
            "flex flex-col bg-card md:w-[440px] md:shrink-0 md:shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.08)]",
            mobileTab === "cart" ? "flex-1 overflow-hidden" : "hidden md:flex"
          )}
        >
          {/* Cart header */}
          <div className="px-4 md:px-5 py-4 border-b flex items-center justify-between shrink-0 bg-gradient-to-r from-[hsl(var(--sidebar-bg))] to-[hsl(var(--sidebar-bg))]/95 text-[hsl(var(--sidebar-fg-active))]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center ring-1 ring-primary/30">
                <ShoppingCart className="w-4.5 h-4.5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight">Panier</span>
                  {totalItems > 0 && (
                    <span className="inline-flex min-w-[24px] h-[24px] px-1.5 rounded-full bg-primary text-primary-foreground text-[12px] items-center justify-center font-bold tabular-nums">
                      {totalItems}
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-70 leading-tight tracking-wide">
                  {totalItems === 0 ? "Aucun article" : `${totalItems} article${totalItems > 1 ? "s" : ""} sélectionné${totalItems > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] font-semibold uppercase tracking-wider opacity-70 hover:opacity-100 hover:text-destructive transition-all px-3 py-2.5 rounded-md hover:bg-white/5 min-h-[44px]"
              >
                Vider
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16 px-6 text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 ring-1 ring-primary/10 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-11 h-11 text-primary/40" strokeWidth={1.5} />
                </div>
                <p className="text-base font-semibold text-foreground mb-1">Panier vide</p>
                <p className="text-[13px] opacity-75 max-w-[260px] leading-relaxed">
                  Scannez un code-barres ou touchez un produit pour démarrer une vente
                </p>
              </div>
            ) : (
              <div className="p-2 md:p-3 space-y-2">
                {cart.map(item => {
                  const lineTotal = item.price * item.qty;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group rounded-xl border bg-card px-3 py-3 transition-all duration-200",
                        flashItem === item.id
                          ? "border-primary/60 bg-primary/5 shadow-md shadow-primary/10 scale-[1.01]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--border))]/80"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                          <ProductIcon name={item.name} category={item.category} size="sm" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold leading-tight line-clamp-2 mb-0.5">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {item.price.toLocaleString()} F · unité
                          </p>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-11 h-11 -mt-1 -mr-1 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                          aria-label={`Retirer ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity & line total row — extra large for vendeur */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-[hsl(var(--border))]">
                        <div className="inline-flex items-center rounded-xl border-2 border-[hsl(var(--border))] bg-background overflow-hidden">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-12 h-12 flex items-center justify-center hover:bg-muted active:bg-muted/70 transition-colors border-r border-[hsl(var(--border))] touch-manipulation"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                          <span className="min-w-[48px] h-12 flex items-center justify-center text-base font-black tabular-nums">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-12 h-12 flex items-center justify-center hover:bg-muted active:bg-muted/70 transition-colors border-l border-[hsl(var(--border))] touch-manipulation"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="w-5 h-5" strokeWidth={2.4} />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sous-total</p>
                          <p className="text-base font-black tabular-nums text-foreground leading-tight">
                            {lineTotal.toLocaleString()} <span className="text-[11px] font-bold text-muted-foreground">F</span>
                          </p>
                        </div>
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
                  <div className="rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 p-4 border border-[hsl(var(--border))]">
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-1">
                      <span>{totalItems} article{totalItems > 1 ? "s" : ""}</span>
                      <span className="tabular-nums">{total.toLocaleString()} F</span>
                    </div>
                    <div className="h-px bg-[hsl(var(--border))] my-2" />
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Total</span>
                      <span className="text-[30px] font-black text-primary tabular-nums leading-none">
                        {total.toLocaleString()} <span className="text-base">F</span>
                      </span>
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full h-16 text-base font-bold rounded-xl",
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
                <div className="animate-slide-in space-y-3.5">
                  {/* Total */}
                  <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 p-4 border border-primary/20">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-1">À payer</p>
                    <p className="text-[34px] font-black text-primary tabular-nums leading-none">
                      {total.toLocaleString()} <span className="text-lg">FCFA</span>
                    </p>
                  </div>

                  {/* Amount received */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Montant reçu du client
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={amountGiven}
                      onChange={e => setAmountGiven(e.target.value)}
                      className="mt-1.5 text-2xl font-black h-16 tabular-nums tracking-tight border-2 focus-visible:border-primary/60 rounded-xl"
                      autoFocus
                    />
                  </div>

                  {/* Quick amounts */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                      Montant rapide
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickAmounts.map(amt => (
                        <button
                          key={amt}
                          onClick={() => setAmountGiven(String(amt))}
                          className="min-h-[44px] px-2 py-2 text-[12px] rounded-lg border-2 border-[hsl(var(--border))] hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition-all font-bold tabular-nums"
                        >
                          {amt.toLocaleString()}
                        </button>
                      ))}
                      <button
                        onClick={() => setAmountGiven(String(total))}
                        className="min-h-[44px] px-2 py-2 text-[12px] rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-2 border-primary/20 active:scale-95 transition-all font-bold col-span-1"
                      >
                        Exact
                      </button>
                    </div>
                  </div>

                  {/* Change — large for vendeur */}
                  {Number(amountGiven) >= total && (
                    <div className="rounded-xl bg-gradient-to-br from-success/15 to-success/5 border-2 border-success/30 p-4 text-center animate-slide-in">
                      <p className="text-[11px] font-bold text-success/80 uppercase tracking-[0.2em] mb-1">
                        Monnaie à rendre
                      </p>
                      <p className="text-[30px] font-black text-success tabular-nums leading-tight">
                        {change.toLocaleString()} <span className="text-lg">FCFA</span>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setShowPayment(false)}
                      className="flex-1 h-14 border-2 font-semibold"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Retour
                    </Button>
                    <Button
                      onClick={handlePayment}
                      disabled={Number(amountGiven) < total}
                      className={cn(
                        "flex-[2] h-16 font-bold text-base rounded-xl",
                        "bg-gradient-to-br from-accent to-accent/85 hover:from-accent/95 hover:to-accent/75",
                        "text-accent-foreground",
                        "shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30",
                        "active:scale-[0.98] transition-all",
                        "disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
                      )}
                    >
                      <CheckCircle className="w-5 h-5 mr-2" strokeWidth={2.2} />
                      Valider la vente
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
