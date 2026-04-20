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
  ScanLine,
  ChevronRight,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Receipt } from "@/components/pos/Receipt";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { toast } from "sonner";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { productService } from "@/services/productService";

interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  category: string;
  image_url?: string | null;
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
  const date = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function getCaisseLabel(username?: string | null): string {
  const match = username?.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 1;
  return `CAISSE ${String(num).padStart(2, "0")}`;
}

function getFirstName(fullName: string | undefined): string {
  if (!fullName) return "Vendeur";
  const trimmed = fullName.trim();
  if (!trimmed) return "Vendeur";
  return trimmed.split(/\s+/)[0];
}

function getInitials(fullName: string | undefined): string {
  if (!fullName) return "V";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}


// ─── Catalog mock data ────────────────────────────────────────────────────────

const catalog: Product[] = [
  {
    id: 1,
    name: "Lait Nido 400g",
    barcode: "6001068002802",
    price: 3500,
    category: "Alimentaire",
  },
  {
    id: 2,
    name: "Huile Dinor 1L",
    barcode: "6001068002819",
    price: 2500,
    category: "Alimentaire",
  },
  {
    id: 3,
    name: "Riz Uncle Ben's 5kg",
    barcode: "6001068002826",
    price: 8000,
    category: "Alimentaire",
  },
  {
    id: 4,
    name: "Coca-Cola 1.5L",
    barcode: "5449000000996",
    price: 1200,
    category: "Boissons",
  },
  {
    id: 5,
    name: "Savon Palmolive",
    barcode: "8714789763378",
    price: 800,
    category: "Hygiène",
  },
  {
    id: 6,
    name: "Pâtes Panzani 500g",
    barcode: "3038350012005",
    price: 1500,
    category: "Alimentaire",
  },
  {
    id: 7,
    name: "Sucre en poudre 1kg",
    barcode: "3256220010015",
    price: 1000,
    category: "Alimentaire",
  },
  {
    id: 8,
    name: "Eau Tangui 1.5L",
    barcode: "6291041500213",
    price: 500,
    category: "Boissons",
  },
  {
    id: 9,
    name: "Biscuits Belvita",
    barcode: "7622300689421",
    price: 1800,
    category: "Alimentaire",
  },
  {
    id: 10,
    name: "Détergent Omo 1kg",
    barcode: "8717163711040",
    price: 3200,
    category: "Entretien",
  },
  {
    id: 11,
    name: "Mayonnaise 500ml",
    barcode: "3250390003120",
    price: 2200,
    category: "Alimentaire",
  },
  {
    id: 12,
    name: "Tomate concentrée",
    barcode: "8005250020116",
    price: 900,
    category: "Alimentaire",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VendeurPosPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const { currentUser } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [amountGiven, setAmountGiven] = useState("");
  const [saleComplete, setSaleComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  const [ticketCounter, setTicketCounter] = useState(1);
  const [currentTicket, setCurrentTicket] = useState({
    number: "",
    date: "",
    time: "",
  });
  const [flashItem, setFlashItem] = useState<number | null>(null);

  // Animation state: newly-added cart items (entrance animation)
  const [newlyAdded, setNewlyAdded] = useState<Set<number>>(new Set());
  // Animation state: items being removed (exit animation)
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set());
  // Product grid mount flag for staggered entrance
  const [gridMounted, setGridMounted] = useState(false);
  // Success screen mount flag
  const [successMounted, setSuccessMounted] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const change = Math.max(0, Math.round(Number(amountGiven) - total));
  const isAmountSufficient = Number(amountGiven) >= total && amountGiven !== "";

  // Trigger product grid stagger entrance on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setGridMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Trigger success screen entrance animation
  useEffect(() => {
    if (saleComplete) {
      setSuccessMounted(false);
      const id = requestAnimationFrame(() => setSuccessMounted(true));
      return () => cancelAnimationFrame(id);
    }
  }, [saleComplete]);

  const vendeurName = getFirstName(currentUser?.name);
  const vendeurInitials = getInitials(currentUser?.name);
  const caisseLabel = getCaisseLabel(currentUser?.username);

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

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setFlashItem(product.id);
    setTimeout(() => { if (mountedRef.current) setFlashItem(null); }, 600);
    // Mark as newly added for entrance animation; clear after 300ms
    setNewlyAdded((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      if (!mountedRef.current) return;
      setNewlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 300);
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
        const scanned = buffer;
        buffer = "";
        // Try API barcode lookup first (works for all products regardless of catalog state)
        productService.getByBarcode(scanned).then((apiProduct) => {
          // Adapter: map API Product fields → local Product shape
          const product: Product = {
            id: apiProduct.id,
            name: apiProduct.name,
            barcode: apiProduct.barcode,
            price: apiProduct.selling_price,
            category: apiProduct.category_name ?? "",
            image_url: apiProduct.image_url ?? null,
          };
          addToCart(product);
        }).catch(() => {
          // Fallback: search in local catalog
          const found = catalog.find((p) => p.barcode === scanned);
          if (found) {
            addToCart(found);
          } else {
            toast.error(`Produit non trouvé : ${scanned}`);
          }
        });
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, [showPayment, saleComplete, addToCart]);

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeItem = (id: number) => {
    // Trigger exit animation first, then remove after 200ms
    setRemovingItems((prev) => new Set(prev).add(id));
    setTimeout(() => {
      if (!mountedRef.current) return;
      setCart((prev) => prev.filter((item) => item.id !== id));
      setRemovingItems((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  };

  const handlePayment = () => {
    if (isSubmitting || !isAmountSufficient) return;
    setIsSubmitting(true);
    const { date, time } = formatDateTime();
    const ticketNumber = formatTicketNumber(ticketCounter);
    setCurrentTicket({ number: ticketNumber, date, time });
    setTicketCounter((prev) => prev + 1);
    setSaleComplete(true);
    setIsSubmitting(false);
    toast.success(
      `Vente enregistrée — ${total.toLocaleString("fr-FR")} FCFA`,
      {
        description: `${cart.length} article(s) · Monnaie : ${change.toLocaleString("fr-FR")} FCFA`,
        duration: 4000,
      },
    );
  };

  function resetSale() {
    setCart([]);
    setShowPayment(false);
    setAmountGiven("");
    setSaleComplete(false);
    setIsSubmitting(false);
    setSearch("");
    setMobileTab("catalog");
  }

  const filtered = catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search),
  );

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000];

  // ─── Success screen ─────────────────────────────────────────────────────────

  if (saleComplete) {
    return (
      <>
        <Topbar
          title="Caisse"
          subtitle="Espace vendeur"
          onMenuClick={onMenuClick}
        />

        <div
          className="flex-1 flex items-center justify-center p-4 overflow-y-auto"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted) / 0.4), hsl(var(--accent) / 0.08))",
          }}
        >
          <div
            className="w-full max-w-sm"
            style={{
              opacity: successMounted ? 1 : 0,
              transform: successMounted ? "scale(1)" : "scale(0.96)",
              transition: "opacity 350ms ease-out, transform 350ms ease-out",
            }}
          >

            {/* Success icon */}
            <div className="text-center mb-5">
              <div className="relative inline-flex mb-3">
                <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center ring-[6px] ring-success/10 shadow-lg shadow-success/10">
                  <CheckCircle
                    className="w-10 h-10 text-success"
                    strokeWidth={2.2}
                  />
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-1">
                Vente enregistrée
              </h2>
              <p className="text-xs text-muted-foreground font-mono tracking-[0.2em]">
                {currentTicket.number}
              </p>
            </div>

            {/* Change amount */}
            <div
              className="rounded-2xl p-5 mb-5 text-center shadow-sm"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--success) / 0.15), hsl(var(--success) / 0.05))",
                border: "1px solid hsl(var(--success) / 0.25)",
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1.5"
                style={{ color: "hsl(var(--success) / 0.8)" }}
              >
                Monnaie à rendre
              </p>
              <p className="text-4xl font-black text-success tracking-tight tabular-nums">
                {change.toLocaleString("fr-FR")}{" "}
                <span className="text-2xl">FCFA</span>
              </p>
              <div
                className="flex justify-center gap-8 mt-4 text-xs text-muted-foreground pt-3"
                style={{
                  borderTop: "1px solid hsl(var(--success) / 0.15)",
                }}
              >
                <span>
                  Total{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {total.toLocaleString("fr-FR")} F
                  </span>
                </span>
                <span>
                  Reçu{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {Number(amountGiven).toLocaleString("fr-FR")} F
                  </span>
                </span>
              </div>
            </div>

            {/* Receipt preview */}
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
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "6px",
                  background:
                    "repeating-linear-gradient(90deg, hsl(var(--card)) 0px, hsl(var(--card)) 5px, hsl(var(--muted)) 5px, hsl(var(--muted)) 10px)",
                }}
              />
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
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "6px",
                  background:
                    "repeating-linear-gradient(90deg, hsl(var(--card)) 0px, hsl(var(--card)) 5px, hsl(var(--muted)) 5px, hsl(var(--muted)) 10px)",
                }}
              />
            </div>

            {/* Cible impression — position:fixed non clippée par overflow:hidden */}
            <div ref={receiptRef} style={{ position: "fixed", left: "-9999px", top: 0, width: "80mm", background: "#fff" }}>
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
                className="flex-1 h-14 font-bold text-[15px]"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  boxShadow: "0 4px 16px hsl(22 72% 48% / 0.35)",
                  border: "none",
                }}
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

  // ─── Main POS screen ─────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title="Caisse"
        subtitle="Espace vendeur"
        onMenuClick={onMenuClick}
      />

      {/* Vendeur identity band — improved copper tint + refined avatar */}
      <div
        className="shrink-0 px-4 md:px-5 py-2.5 border-b flex items-center gap-3"
        style={{
          background:
            "linear-gradient(to right, hsl(22 72% 48% / 0.08), hsl(22 72% 48% / 0.03), transparent)",
        }}
      >
        {/* Avatar with initials — rounded-[10px] */}
        <div
          className="flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background:
              "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
            boxShadow: "0 3px 10px hsl(22 72% 48% / 0.3)",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          {vendeurInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="uppercase tracking-wider font-semibold leading-none"
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Vendeur
          </p>
          <p className="text-sm font-bold text-foreground truncate">
            {vendeurName}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/15 text-success text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="tracking-wide">En session</span>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted) / 0.25))",
        }}
      >
        {/* Mobile tabs */}
        <div className="flex md:hidden border-b shrink-0 bg-card/80 backdrop-blur-sm">
          <button
            onClick={() => setMobileTab("catalog")}
            className={cn(
              "flex-1 py-4 text-[15px] font-semibold transition-all min-h-[52px] relative",
              mobileTab === "catalog"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
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
                : "text-muted-foreground hover:text-foreground",
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

        {/* ── Catalog panel ────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col min-w-0 md:flex-1 md:border-r border-[hsl(var(--border))]",
            mobileTab === "catalog"
              ? "flex-1 overflow-hidden"
              : "hidden md:flex",
          )}
        >
          {/* Search header */}
          <div
            className="p-4 md:p-5 border-b shrink-0"
            style={{ background: "hsl(var(--card) / 0.7)" }}
          >
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-card border-2 border-[hsl(var(--border))] rounded-xl focus-within:border-primary/60 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
                <div className="flex items-center justify-center w-14 h-14 shrink-0">
                  <Search
                    className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors"
                    strokeWidth={2}
                  />
                </div>
                <Input
                  ref={searchRef}
                  placeholder="Rechercher ou scanner un produit…"
                  className="flex-1 h-14 border-0 bg-transparent text-base font-medium placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                  <ScanLine className="w-3.5 h-3.5" />
                  <span className="tracking-wide">Scanner prêt</span>
                </div>
              </div>
            </div>
            {/* Meta bar */}
            <div className="hidden md:flex items-center justify-between mt-2.5 px-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" style={{ color: "hsl(22 72% 48% / 0.7)" }} />
                <span>{catalog.length} produit{catalog.length !== 1 ? "s" : ""} disponible{catalog.length !== 1 ? "s" : ""}</span>
              </div>
              <span className="font-mono tracking-wider opacity-60">{caisseLabel}</span>
            </div>
          </div>

          {/* Catalog grid */}
          <div className="flex-1 overflow-y-auto p-3 md:p-5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Search className="w-7 h-7 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Aucun produit trouvé
                </p>
                <p className="text-xs mt-1 max-w-[220px] text-center">
                  Essayez avec un autre mot-clé ou scannez un code-barres
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4">
                {filtered.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={cn(
                      "group relative bg-card rounded-xl border border-[hsl(var(--border))] p-2 sm:p-3 text-left",
                      "transition-all duration-200 ease-out",
                      "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/8 hover:-translate-y-0.5",
                      "active:scale-[0.97] active:translate-y-0",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      "min-h-[44px] cursor-pointer",
                    )}
                    style={{
                      opacity: gridMounted ? 1 : 0,
                      transition: `opacity 300ms ease ${index * 40}ms`,
                    }}
                    title={product.name}
                  >
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-2.5 overflow-hidden group-hover:from-primary/10 group-hover:to-accent/5 transition-colors">
                      <div className="group-hover:scale-110 transition-transform duration-200">
                        <ProductIcon
                          name={product.name}
                          category={product.category}
                          size="md"
                          imageUrl={product.image_url}
                        />
                      </div>
                    </div>

                    <p className="text-[13px] font-semibold leading-tight line-clamp-2 text-foreground mb-1.5 min-h-[32px]">
                      {product.name}
                    </p>

                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-[15px] font-black tabular-nums leading-none"
                        style={{
                          color: "hsl(var(--primary))",
                          fontFamily: "'Fraunces', Georgia, serif",
                        }}
                      >
                        {product.price.toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        FCFA
                      </span>
                    </div>

                    {/* Hover ring */}
                    <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-primary/0 group-hover:ring-primary/20 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart / ticket panel ──────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-col md:w-[420px] md:shrink-0 min-w-0",
            mobileTab === "cart"
              ? "flex-1 overflow-hidden"
              : "hidden md:flex",
          )}
          style={{
            background: "hsl(var(--card))",
            boxShadow: "-8px 0 24px -12px hsl(0 0% 0% / 0.1)",
          }}
        >
          {/* Cart header — richer dark gradient + diagonal pattern overlay */}
          <div
            className="px-4 md:px-5 py-4 border-b flex items-center justify-between shrink-0 relative overflow-hidden"
            style={{
              background: "hsl(var(--sidebar-bg))",
            }}
          >
            {/* Diagonal stripe pattern */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, hsl(22 72% 62%) 0px, hsl(22 72% 62%) 1px, transparent 1px, transparent 14px)",
                opacity: 0.05,
              }}
            />
            {/* Subtle copper glow top-right */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsl(22 72% 48% / 0.25), transparent 70%)",
              }}
            />

            <div className="relative flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center ring-1 shrink-0"
                style={{
                  background: "hsl(22 72% 48% / 0.2)",
                  ringColor: "hsl(22 72% 48% / 0.3)",
                }}
              >
                <ShoppingCart
                  className="w-5 h-5"
                  strokeWidth={2.2}
                  style={{ color: "hsl(22 72% 62%)" }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-base font-bold tracking-tight"
                    style={{ color: "hsl(var(--sidebar-fg-active))" }}
                  >
                    Ticket en cours
                  </span>
                  {totalItems > 0 && (
                    <span
                      className="inline-flex min-w-[24px] h-[24px] px-1.5 rounded-full text-[12px] items-center justify-center font-bold tabular-nums text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                      }}
                    >
                      {totalItems}
                    </span>
                  )}
                </div>
                <p
                  className="text-[11px] leading-tight tracking-wide mt-0.5"
                  style={{ color: "hsl(var(--sidebar-fg) / 0.65)" }}
                >
                  {totalItems === 0
                    ? "Aucun article"
                    : `${totalItems} article${totalItems > 1 ? "s" : ""} sélectionné${totalItems > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="relative text-[11px] font-semibold uppercase tracking-wider hover:text-destructive transition-all px-3 py-2.5 rounded-md hover:bg-white/5 min-h-[44px]"
                style={{ color: "hsl(var(--sidebar-fg) / 0.6)" }}
              >
                Vider
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16 px-6 text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-full bg-primary/5 scale-[1.5] opacity-60" />
                  <div className="absolute inset-0 rounded-full bg-primary/8 scale-[1.25] opacity-40" />
                  <div
                    className="relative w-28 h-28 rounded-full flex items-center justify-center ring-2 shadow-warm-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08))",
                      ringColor: "hsl(var(--primary) / 0.15)",
                    }}
                  >
                    <ShoppingCart
                      className="w-12 h-12 text-primary/50"
                      strokeWidth={1.5}
                    />
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-card border border-primary/20 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-primary/60" />
                    </span>
                  </div>
                </div>
                <p className="text-base font-bold text-foreground mb-1.5 tracking-tight">
                  Panier vide
                </p>
                <p className="text-[13px] leading-relaxed max-w-[240px]">
                  Scannez ou cherchez un produit pour démarrer la vente
                </p>
              </div>
            ) : (
              <div className="p-2 md:p-2.5 space-y-1.5">
                {cart.map((item) => {
                  const lineTotal = item.price * item.qty;
                  const isNew = newlyAdded.has(item.id);
                  const isRemoving = removingItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group border bg-card px-3 py-2.5",
                        flashItem === item.id
                          ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10 scale-[1.005]"
                          : "border-[hsl(var(--border))] hover:border-[hsl(var(--border))]/80",
                      )}
                      style={{
                        borderRadius: "10px",
                        opacity: isRemoving ? 0 : isNew ? 0 : 1,
                        transform: isRemoving
                          ? "translateX(10px)"
                          : isNew
                          ? "translateX(10px)"
                          : "translateX(0)",
                        transition: isRemoving
                          ? "opacity 200ms ease, transform 200ms ease"
                          : "opacity 250ms ease, transform 250ms ease, border-color 200ms, background 200ms, box-shadow 200ms, scale 200ms",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-lg bg-muted shrink-0 flex items-center justify-center overflow-hidden">
                          <ProductIcon
                            name={item.name}
                            category={item.category}
                            size="sm"
                            imageUrl={item.image_url}
                          />
                        </div>

                        {/* Name + unit price */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold leading-tight truncate">
                            {item.name}
                          </p>
                          <span
                            className="text-[11px] tabular-nums"
                            style={{
                              color: "hsl(var(--muted-foreground))",
                              fontFamily: "'Fraunces', Georgia, serif",
                            }}
                          >
                            {item.price.toLocaleString("fr-FR")} F
                          </span>
                        </div>

                        {/* Stepper */}
                        <div className="inline-flex items-center rounded-lg border border-[hsl(var(--border))] bg-background overflow-hidden shrink-0">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-muted active:bg-muted/70 transition-colors border-r border-[hsl(var(--border))] touch-manipulation"
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2.4} />
                          </button>
                          {/* Quantity in copper badge */}
                          <span
                            className="min-w-[36px] h-9 flex items-center justify-center text-[13px] font-black tabular-nums text-white"
                            style={{
                              background:
                                "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                            }}
                          >
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-muted active:bg-muted/70 transition-colors border-l border-[hsl(var(--border))] touch-manipulation"
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
                          </button>
                        </div>

                        {/* Line total in Fraunces */}
                        <div className="text-right shrink-0 min-w-[60px]">
                          <p
                            className="text-[14px] font-black tabular-nums text-foreground leading-tight"
                            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                          >
                            {lineTotal.toLocaleString("fr-FR")}{" "}
                            <span
                              className="text-[10px] font-bold"
                              style={{ fontFamily: "inherit", color: "hsl(var(--muted-foreground))" }}
                            >
                              F
                            </span>
                          </p>
                        </div>

                        {/* Trash */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                          aria-label={`Retirer ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
            <div className="border-t bg-card p-3 md:p-5 shrink-0 space-y-3">
              {!showPayment ? (
                <>
                  {/* Total block */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background:
                        "hsl(var(--sidebar-bg))",
                      border: "1px solid hsl(22 72% 48% / 0.2)",
                    }}
                  >
                    <div
                      className="flex items-center justify-between text-[12px] mb-1"
                      style={{ color: "hsl(var(--sidebar-fg) / 0.6)" }}
                    >
                      <span>
                        {totalItems} article{totalItems > 1 ? "s" : ""}
                      </span>
                      <span className="tabular-nums">
                        {total.toLocaleString("fr-FR")} F
                      </span>
                    </div>
                    <div
                      className="h-px my-2"
                      style={{
                        background: "hsl(var(--sidebar-border))",
                      }}
                    />
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: "hsl(var(--sidebar-fg) / 0.6)" }}
                      >
                        Total
                      </span>
                      <span
                        className="text-[26px] md:text-[30px] font-black tabular-nums leading-none"
                        style={{
                          fontFamily: "'Fraunces', Georgia, serif",
                          background:
                            "linear-gradient(135deg, hsl(22 72% 62%), hsl(36 88% 62%))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {total.toLocaleString("fr-FR")}{" "}
                        <span className="text-base">F</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full h-16 text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] animate-glow-pulse"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                      borderRadius: "14px",
                      boxShadow: "0 8px 24px hsl(22 72% 48% / 0.4)",
                    }}
                  >
                    <Banknote className="w-5 h-5" strokeWidth={2.2} />
                    Encaisser · {total.toLocaleString("fr-FR")} F
                  </button>
                </>
              ) : (
                <div className="animate-slide-in-right space-y-3 overflow-y-auto max-h-[80vh]">
                  {/* Total à payer */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(22 72% 48% / 0.12), hsl(36 88% 52% / 0.06))",
                      border: "1px solid hsl(22 72% 48% / 0.22)",
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                      style={{ color: "hsl(22 72% 62%)" }}
                    >
                      À payer
                    </p>
                    <p
                      key={total}
                      className="text-[28px] md:text-[34px] font-black tabular-nums leading-none animate-count-up"
                      style={{
                        color: "hsl(var(--foreground))",
                        transition: "all 0.3s ease",
                        fontFamily: "'Fraunces', Georgia, serif",
                      }}
                    >
                      {total.toLocaleString("fr-FR")}{" "}
                      <span className="text-lg">FCFA</span>
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
                      pattern="[0-9]*"
                      placeholder="0"
                      value={amountGiven}
                      onChange={(e) => setAmountGiven(e.target.value)}
                      className="mt-1.5 text-xl md:text-2xl font-black h-14 md:h-16 tabular-nums tracking-tight border-2 focus-visible:border-primary/60 rounded-xl"
                      autoFocus
                    />
                  </div>

                  {/* Quick amounts */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                      Montant rapide
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {quickAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setAmountGiven(String(amt))}
                          className="min-h-[44px] px-1 py-2 text-[11px] rounded-lg border-2 border-[hsl(var(--border))] hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition-all font-bold tabular-nums touch-manipulation"
                        >
                          {amt.toLocaleString("fr-FR")}
                        </button>
                      ))}
                      <button
                        onClick={() => setAmountGiven(String(total))}
                        className="min-h-[44px] px-1 py-2 text-[11px] rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-2 border-primary/20 active:scale-95 transition-all font-bold col-span-1 touch-manipulation"
                      >
                        Exact
                      </button>
                    </div>
                  </div>

                  {/* Change display — green tint when sufficient */}
                  {isAmountSufficient && (
                    <div
                      className="rounded-xl p-4 text-center animate-fade-scale"
                      style={{
                        background:
                          "linear-gradient(135deg, hsl(142 72% 38% / 0.08), hsl(142 72% 38% / 0.04))",
                        border: "2px solid hsl(var(--success) / 0.3)",
                        transition: "background 300ms ease, border-color 300ms ease",
                      }}
                    >
                      <p
                        className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1"
                        style={{ color: "hsl(var(--success) / 0.8)" }}
                      >
                        Monnaie à rendre
                      </p>
                      <p
                        key={change}
                        className="text-[26px] md:text-[30px] font-black text-success tabular-nums leading-tight animate-count-up"
                        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                      >
                        {change.toLocaleString("fr-FR")}{" "}
                        <span className="text-lg">FCFA</span>
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
                    <button
                      onClick={handlePayment}
                      disabled={!isAmountSufficient || isSubmitting}
                      className={cn(
                        "flex-[2] font-bold text-base text-white flex items-center justify-center gap-2",
                        "transition-all active:scale-[0.98]",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                        isAmountSufficient && !isSubmitting && "animate-glow-pulse",
                      )}
                      style={
                        isAmountSufficient
                          ? {
                              height: "64px",
                              borderRadius: "14px",
                              background:
                                "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                              boxShadow: "0 8px 24px hsl(22 72% 48% / 0.45)",
                            }
                          : {
                              height: "64px",
                              borderRadius: "14px",
                              background: "hsl(var(--muted))",
                              color: "hsl(var(--muted-foreground))",
                            }
                      }
                    >
                      <Zap className="w-5 h-5" strokeWidth={2.2} />
                      Valider la vente
                      {isAmountSufficient && (
                        <CheckCircle className="w-4 h-4 opacity-80" />
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
