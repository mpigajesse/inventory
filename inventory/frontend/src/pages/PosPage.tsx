import { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Minus, Trash2, ShoppingCart, Banknote, CheckCircle, X, Printer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { toast } from "@/hooks/use-toast";
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
    },
    onError: () => {
      toast({
        title: "Erreur lors de la vente",
        description: "Stock insuffisant ou erreur serveur. Vérifiez les quantités.",
        variant: "destructive",
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

        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto bg-muted/30">
          <div className="w-full max-w-sm animate-slide-in">

            <div className="text-center mb-5">
              <div className="relative inline-flex mb-3">
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center ring-4 ring-success/10">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-0.5">Vente enregistrée</h2>
              <p className="text-xs text-muted-foreground font-mono tracking-widest">{currentTicket.number}</p>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 text-center">
              <p className="text-xs font-medium text-success/80 uppercase tracking-widest mb-1">Monnaie à rendre</p>
              <p className="text-3xl font-black text-success tracking-tight">{change.toLocaleString()} FCFA</p>
              <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
                <span>Total <span className="font-semibold text-foreground">{total.toLocaleString()} F</span></span>
                <span>Reçu <span className="font-semibold text-foreground">{Number(amountGiven).toLocaleString()} F</span></span>
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

  // ─── Main POS screen ──────────────────────────────────────────────────────

  return (
    <>
      <Topbar title="Point de vente" subtitle="Scan code-barres ou recherche rapide" onMenuClick={onMenuClick} />

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
            {catalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Search className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {catalog.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={cn(
                      "bg-card rounded-lg border p-3 text-left hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.97]",
                      product.stock_quantity === 0 && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={product.stock_quantity === 0}
                    title={product.stock_quantity === 0 ? "Rupture de stock" : undefined}
                  >
                    <div className="mb-2">
                      <ProductIcon name={product.name} category={product.category_name} size="md" />
                    </div>
                    <p className="text-xs font-medium leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-sm font-semibold mt-1 text-primary">{product.selling_price.toLocaleString()} F</p>
                    {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                      <p className="text-[10px] text-warning mt-0.5">Stock : {product.stock_quantity}</p>
                    )}
                    {product.stock_quantity === 0 && (
                      <p className="text-[10px] text-destructive mt-0.5">Rupture</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart panel ── */}
        <div
          className={cn(
            "flex flex-col bg-card md:w-[380px] md:shrink-0",
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

          {/* Stock warnings banner */}
          {stockWarnings.length > 0 && (
            <div className="mx-3 mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 flex items-start gap-2 text-xs text-warning shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Quantité insuffisante en stock :{" "}
                {stockWarnings.map(i => `${i.name} (stock : ${i.stock})`).join(", ")}
              </span>
            </div>
          )}

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
                      flashItem === item.id && "bg-primary/10",
                      item.qty > item.stock && "bg-warning/5"
                    )}
                  >
                    <ProductIcon name={item.name} category={item.category} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.price.toLocaleString()} F × {item.qty}</p>
                      {item.qty > item.stock && (
                        <p className="text-[10px] text-warning flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Stock : {item.stock}
                        </p>
                      )}
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
                    <Button
                      variant="outline"
                      onClick={() => setShowPayment(false)}
                      className="flex-1"
                      disabled={saleMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Retour
                    </Button>
                    <Button
                      onClick={handlePayment}
                      disabled={Number(amountGiven) < total || saleMutation.isPending || stockWarnings.length > 0}
                      className="flex-1"
                    >
                      {saleMutation.isPending ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          Enregistrement…
                        </span>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Valider
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
