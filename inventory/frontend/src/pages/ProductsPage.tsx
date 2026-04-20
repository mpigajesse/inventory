import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/button";
import { TableToolbar, exportToCsv } from "@/components/ui/TableToolbar";
import { TablePagination } from "@/components/ui/TablePagination";
import { SortableHeader } from "@/components/ui/SortableHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Package,
  LayoutList,
  LayoutGrid,
  FileSpreadsheet,
  Barcode,
} from "lucide-react";
import { exportProducts } from "@/lib/exportProducts";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/productService";
import type { Product } from "@/services/productService";
import { useTableManager } from "@/hooks/useTableManager";
import { usePermissions } from "@/hooks/usePermissions";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "view"; product: Product }
  | { type: "delete"; product: Product }
  | { type: "delete-selection"; ids: number[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockStatusVariant(status: Product["stock_status"]): "danger" | "warning" | "success" {
  if (status === "critique") return "danger";
  if (status === "bas") return "warning";
  return "success";
}

function stockStatusLabel(status: Product["stock_status"]): string {
  if (status === "critique") return "Critique";
  if (status === "bas") return "Bas";
  return "Normal";
}

// ─── Stock badge overlay helper ───────────────────────────────────────────────

function StockOverlayBadge({ product }: { product: Product }) {
  const isOut = product.stock_quantity <= 0;
  const minThreshold = (product as Product & { min_threshold?: number }).min_threshold ?? 0;
  const isLow = !isOut && minThreshold > 0 && product.stock_quantity <= minThreshold;

  const label = isOut
    ? "Rupture"
    : isLow
      ? `Bas : ${product.stock_quantity}`
      : `${product.stock_quantity} en stock`;

  return (
    <span
      className="text-[10px] font-bold leading-none"
      style={{
        background: "rgba(0,0,0,0.6)",
        color: "white",
        backdropFilter: "blur(8px)",
        borderRadius: "8px",
        padding: "3px 8px",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() =>
    (localStorage.getItem("products-view") as "list" | "grid") ?? "grid"
  );

  function setView(mode: "list" | "grid") {
    setViewMode(mode);
    localStorage.setItem("products-view", mode);
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll(),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productService.getCategories(),
  });

  const products: Product[] = data?.results ?? [];
  const categories = categoriesData ?? [];

  const categoryFilterOptions = categories.map((c) => ({
    value: c.name,
    label: c.name,
  }));

  // ── Delete mutation ────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprimé");
      setModal({ type: "none" });
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error("Erreur lors de la suppression", {
        description: detail ?? "Impossible de supprimer ce produit. Réessayez.",
      });
    },
  });

  // ── Generate barcode mutation ──────────────────────────────────────────────

  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());

  async function handleGenerateBarcode(productId: number) {
    setGeneratingIds((prev) => new Set(prev).add(productId));
    try {
      await productService.generateBarcode(productId);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Code-barres généré");
    } catch {
      toast.error("Erreur lors de la génération du code-barres");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  // ── Category pre-filter (before table pipeline) ────────────────────────────

  const categoryFiltered = categoryFilter
    ? products.filter((p) => p.category_name === categoryFilter)
    : products;

  // ── Table manager ──────────────────────────────────────────────────────────

  const {
    paginated,
    filtered,
    search,
    setSearch,
    sort,
    toggleSort,
    selectedIds,
    isSelected,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    rangeStart,
    rangeEnd,
  } = useTableManager(categoryFiltered as unknown as Record<string, unknown>[], {
    initialPageSize: 10,
    searchKeys: ["name", "barcode"] as never[],
  });

  const typedPaginated = paginated as unknown as Product[];
  const allPageIds = typedPaginated.map((p) => p.id);

  // Animation key — changes on filter/search so the grid re-mounts and stagger replays
  const [animKey, setAnimKey] = useState(0);
  const prevFilterRef = useRef({ search: "", category: "" });

  useEffect(() => {
    const prev = prevFilterRef.current;
    const searchChanged = prev.search !== search;
    const categoryChanged = prev.category !== categoryFilter;
    if (searchChanged || categoryChanged) {
      setAnimKey((k) => k + 1);
    }
    prevFilterRef.current = { search, category: categoryFilter };
  }, [search, categoryFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDelete() {
    if (modal.type !== "delete") return;
    deleteMutation.mutate(modal.product.id);
  }

  function handleDeleteSelection() {
    const ids = Array.from(selectedIds) as number[];
    if (ids.length === 0) return;
    setModal({ type: "delete-selection", ids });
  }

  function confirmDeleteSelection() {
    if (modal.type !== "delete-selection") return;
    const ids = modal.ids;
    Promise.all(ids.map((id) => productService.delete(id)))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success(`${ids.length} produit(s) supprimé(s)`);
        clearSelection();
        setModal({ type: "none" });
      })
      .catch(() => {
        toast.error("Erreur lors de la suppression", {
          description: "Certains produits n'ont pas pu être supprimés.",
        });
        setModal({ type: "none" });
      });
  }

  function handleExport() {
    const cols = [
      { key: "name", label: "Nom" },
      { key: "barcode", label: "Code-barres" },
      { key: "category_name", label: "Catégorie" },
      { key: "selling_price", label: "Prix vente (FCFA)" },
      { key: "stock_quantity", label: "Stock" },
    ];
    exportToCsv(filtered as unknown as Record<string, unknown>[], cols, "produits");
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title="Produits"
        subtitle="Gestion du catalogue produits"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">

        {/* ── Page header premium ────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-1 h-7 rounded-full shrink-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, hsl(22 72% 48%), hsl(36 88% 52%))",
                  }}
                />
                <h2
                  className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Catalogue produits
                </h2>
              </div>
              <p className="text-sm text-muted-foreground ml-3">
                {isLoading ? (
                  <span className="opacity-60">Chargement…</span>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">
                      {products.length}
                    </span>{" "}
                    produit{products.length !== 1 ? "s" : ""}
                    {categories.length > 0 && (
                      <>
                        {" · "}
                        <span className="font-semibold text-foreground">
                          {categories.length}
                        </span>{" "}
                        catégorie{categories.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportProducts(products)}
                className="rounded-lg"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>
              {can("manage_products") && (
                <button
                  onClick={() => navigate("/products/new")}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                    boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Barre de filtres premium ───────────────────────────────────────── */}
        <div
          className="flex flex-wrap items-center gap-3 mb-5 p-3 sm:p-4 rounded-2xl"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 1px 3px hsl(22 30% 15% / 0.06)",
          }}
        >
          {/* Search */}
          <div
            className="flex-1 min-w-[180px] relative"
            style={{
              borderRadius: "14px",
              background: "white",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 0 0 3px hsl(22 72% 48% / 0.15), 0 1px 6px rgba(0,0,0,0.06)";
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                "0 1px 6px rgba(0,0,0,0.06)";
            }}
          >
            <SearchInput
              placeholder="Rechercher un produit ou code-barres..."
              value={search}
              onChange={setSearch}
              className="[&_input]:border-0 [&_input]:shadow-none [&_input]:rounded-none [&_input]:bg-transparent [&_input]:focus-visible:ring-0"
            />
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 shrink-0 max-w-full">
              {/* "Tous" pill */}
              <button
                onClick={() => { setCategoryFilter(""); clearSelection(); }}
                className="text-xs whitespace-nowrap transition-all duration-200"
                style={
                  categoryFilter === ""
                    ? {
                        background:
                          "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                        color: "white",
                        boxShadow: "0 4px 12px hsl(22 72% 48% / 0.3)",
                        borderRadius: "100px",
                        padding: "6px 16px",
                        fontWeight: 600,
                      }
                    : {
                        background: "hsl(var(--muted))",
                        color: "hsl(var(--foreground))",
                        borderRadius: "100px",
                        padding: "6px 16px",
                        fontWeight: 500,
                      }
                }
                onMouseEnter={(e) => {
                  if (categoryFilter !== "") {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(22 72% 48% / 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFilter !== "") {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))";
                  }
                }}
              >
                Tous
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategoryFilter(cat.name === categoryFilter ? "" : cat.name);
                    clearSelection();
                  }}
                  className="text-xs whitespace-nowrap transition-all duration-200"
                  style={
                    categoryFilter === cat.name
                      ? {
                          background:
                            "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                          color: "white",
                          boxShadow: "0 4px 12px hsl(22 72% 48% / 0.3)",
                          borderRadius: "100px",
                          padding: "6px 16px",
                          fontWeight: 600,
                        }
                      : {
                          background: "hsl(var(--muted))",
                          color: "hsl(var(--foreground))",
                          borderRadius: "100px",
                          padding: "6px 16px",
                          fontWeight: 500,
                        }
                  }
                  onMouseEnter={(e) => {
                    if (categoryFilter !== cat.name) {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsl(22 72% 48% / 0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (categoryFilter !== cat.name) {
                      (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))";
                    }
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div
            className="flex rounded-lg overflow-hidden border border-border shrink-0"
            style={{ background: "hsl(var(--muted)/0.4)", transition: "opacity 0.2s ease" }}
          >
            <button
              aria-label="Vue liste"
              onClick={() => setView("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={
                viewMode === "list"
                  ? { color: "hsl(22 72% 48%)" }
                  : undefined
              }
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              aria-label="Vue grille"
              onClick={() => setView("grid")}
              className={cn(
                "p-2 transition-colors border-l border-border",
                viewMode === "grid"
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={
                viewMode === "grid"
                  ? { color: "hsl(22 72% 48%)" }
                  : undefined
              }
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barre d'outils tableau */}
        <TableToolbar
          showCheckbox
          isAllSelected={isAllSelected(allPageIds)}
          isIndeterminate={isIndeterminate(allPageIds)}
          onToggleAll={() => toggleAll(allPageIds)}
          selectedCount={selectedIds.size}
          bulkActions={
            can("manage_products") ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDeleteSelection}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Supprimer la sélection
              </Button>
            ) : undefined
          }
          filterValue={categoryFilter}
          filterOptions={categoryFilterOptions}
          filterPlaceholder="Toutes catégories"
          onFilterChange={(val) => {
            setCategoryFilter(val);
            clearSelection();
          }}
          showExport
          onExport={handleExport}
        />

        {/* ── Vue grille premium ─────────────────────────────────────────────── */}
        {viewMode === "grid" && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-14">
                <Loader2
                  className="w-6 h-6 animate-spin"
                  style={{ color: "hsl(22 72% 48%)" }}
                />
              </div>
            )}
            {!isLoading && typedPaginated.length === 0 && (
              <div
                className="rounded-2xl border py-16 flex flex-col items-center gap-4 text-muted-foreground"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  animation: "fadeIn 0.4s ease both",
                }}
              >
                <div
                  style={{
                    background: "hsl(22 72% 48% / 0.08)",
                    borderRadius: "50%",
                    padding: "2rem",
                    boxShadow: "0 0 0 8px hsl(22 72% 48% / 0.04)",
                  }}
                >
                  <Package
                    className="w-10 h-10"
                    style={{ color: "hsl(22 72% 48% / 0.5)" }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground/60">Aucun produit trouvé.</p>
                  <p className="text-xs text-muted-foreground mt-1">Ajoutez votre premier produit au catalogue.</p>
                </div>
              </div>
            )}
            {!isLoading && typedPaginated.length > 0 && (
              <div key={animKey} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {typedPaginated.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    canManage={can("manage_products")}
                    onEdit={() => navigate(`/products/${product.id}/edit`)}
                    onDelete={() => setModal({ type: "delete", product })}
                    onView={() => setModal({ type: "view", product })}
                    animIndex={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Vue liste mobile (md:hidden) ───────────────────────────────────── */}
        <div className={cn("space-y-2", viewMode === "grid" ? "hidden" : "md:hidden")}>
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "hsl(22 72% 48%)" }}
              />
            </div>
          )}
          {!isLoading && typedPaginated.length === 0 && (
            <div
              className="bg-card border rounded-2xl py-10 flex flex-col items-center gap-2 text-muted-foreground"
              style={{ animation: "fadeIn 0.4s ease both" }}
            >
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-sm">Aucun produit trouvé.</p>
            </div>
          )}
          {!isLoading &&
            typedPaginated.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "bg-card border rounded-2xl p-4 flex items-start justify-between gap-3 transition-all duration-200",
                  isSelected(product.id)
                    ? "ring-1 ring-primary/30 bg-primary/5"
                    : ""
                )}
                style={{
                  borderLeft: isSelected(product.id)
                    ? "3px solid hsl(22 72% 48%)"
                    : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected(product.id)) {
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = "hsl(22 72% 48%)";
                    (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--muted)/0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected(product.id)) {
                    (e.currentTarget as HTMLDivElement).style.borderLeftColor = "transparent";
                    (e.currentTarget as HTMLDivElement).style.background = "";
                  }
                }}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected(product.id)}
                    onChange={() => toggleRow(product.id)}
                    className="h-4 w-4 mt-1 rounded border-input accent-primary cursor-pointer shrink-0"
                    aria-label={`Sélectionner ${product.name}`}
                  />
                  {product.image_url ? (
                    <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <ProductIcon
                      name={product.name}
                      category={product.category_name}
                      size="sm"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {product.category_name ?? "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: "hsl(22 72% 48%)" }}
                      >
                        {(product.selling_price ?? 0).toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · Stock : {product.stock_quantity}
                      </span>
                    </div>
                    <div className="mt-2">
                      <StatusBadge
                        label={stockStatusLabel(product.stock_status)}
                        variant={stockStatusVariant(product.stock_status)}
                      />
                    </div>
                    {product.barcode && (
                      <p className="font-mono text-[11px] text-muted-foreground mt-1.5 truncate">
                        {product.barcode}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    title="Voir les détails"
                    onClick={() => setModal({ type: "view", product })}
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {can("manage_products") && (
                    <button
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      title="Modifier"
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {can("manage_products") && (
                    <button
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Supprimer"
                      onClick={() => setModal({ type: "delete", product })}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* ── Table premium desktop (hidden md:block) ────────────────────────── */}
        <div
          className={cn(
            "rounded-2xl border overflow-hidden",
            viewMode === "grid" ? "hidden" : "hidden md:block"
          )}
          style={{
            background: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            boxShadow: "0 2px 8px hsl(22 30% 15% / 0.06)",
          }}
        >
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="data-table w-full">
              <thead
                className="sticky top-0 z-10"
                style={{
                  background:
                    "linear-gradient(to right, hsl(30 20% 96%), hsl(30 15% 94%))",
                  backdropFilter: "blur(8px)",
                  borderBottom: "1px solid hsl(var(--border))",
                }}
              >
                <tr>
                  <th className="w-10 px-4">
                    <span className="sr-only">Sélection</span>
                  </th>
                  <SortableHeader
                    label="Produit"
                    sortKey="name"
                    currentSort={sort}
                    onSort={toggleSort}
                  />
                  <th>Code-barres</th>
                  <th>Catégorie</th>
                  <SortableHeader
                    label="Prix vente"
                    sortKey="selling_price"
                    currentSort={sort}
                    onSort={toggleSort}
                  />
                  <SortableHeader
                    label="Stock"
                    sortKey="stock_quantity"
                    currentSort={sort}
                    onSort={toggleSort}
                  />
                  <th>Statut</th>
                  <th className="w-28 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Loader2
                        className="w-6 h-6 animate-spin mx-auto"
                        style={{ color: "hsl(22 72% 48%)" }}
                      />
                    </td>
                  </tr>
                )}
                {!isLoading && typedPaginated.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Aucun produit trouvé.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  typedPaginated.map((product, idx) => (
                    <tr
                      key={product.id}
                      className="transition-colors"
                      style={
                        isSelected(product.id)
                          ? { background: "hsl(22 72% 48% / 0.06)" }
                          : idx % 2 === 1
                            ? { background: "hsl(var(--muted)/0.25)" }
                            : undefined
                      }
                      onMouseEnter={(e) => {
                        if (!isSelected(product.id))
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            "hsl(22 72% 48% / 0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected(product.id))
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            idx % 2 === 1 ? "hsl(var(--muted)/0.25)" : "";
                      }}
                    >
                      <td className="w-10">
                        <input
                          type="checkbox"
                          checked={isSelected(product.id)}
                          onChange={() => toggleRow(product.id)}
                          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                          aria-label={`Sélectionner ${product.name}`}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-border/50">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <ProductIcon
                              name={product.name}
                              category={product.category_name}
                              size="sm"
                            />
                          )}
                          <span className="font-medium truncate min-w-0">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ maxWidth: "160px" }}>
                        {product.barcode ? (
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground max-w-full truncate">
                            {product.barcode}
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1.5"
                            disabled={generatingIds.has(product.id)}
                            onClick={() => handleGenerateBarcode(product.id)}
                          >
                            {generatingIds.has(product.id) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Barcode className="w-3.5 h-3.5" />
                            )}
                            Générer
                          </Button>
                        )}
                      </td>
                      <td className="text-sm">{product.category_name ?? "—"}</td>
                      <td>
                        <span
                          className="font-bold text-sm tabular-nums"
                          style={{ color: "hsl(22 72% 48%)" }}
                        >
                          {(product.selling_price ?? 0).toLocaleString("fr-FR")} FCFA
                        </span>
                      </td>
                      <td className="text-sm tabular-nums">
                        {product.stock_quantity}
                      </td>
                      <td>
                        <StatusBadge
                          label={stockStatusLabel(product.stock_status)}
                          variant={stockStatusVariant(product.stock_status)}
                        />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 pr-2">
                          <button
                            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                            title="Voir les détails"
                            onClick={() => setModal({ type: "view", product })}
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {can("manage_products") && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                              title="Modifier"
                              onClick={() =>
                                navigate(`/products/${product.id}/edit`)
                              }
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                          {can("manage_products") && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                              title="Supprimer"
                              onClick={() =>
                                setModal({ type: "delete", product })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          )}
                          <button
                            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                            title="Plus d'options"
                          >
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <TablePagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ── Modal : Vue détail ──────────────────────────────────────────────── */}
      {modal.type === "view" && (
        <Dialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du produit</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* Image */}
              <div className="flex justify-center">
                {modal.product.image_url ? (
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border border-border/60">
                    <img
                      src={modal.product.image_url}
                      alt={modal.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <ProductIcon
                    name={modal.product.name}
                    category={modal.product.category_name}
                    size="xl"
                  />
                )}
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Nom
                  </p>
                  <p className="font-semibold">{modal.product.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Catégorie
                  </p>
                  <p className="font-semibold">{modal.product.category_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Prix de vente
                  </p>
                  <p
                    className="font-bold tabular-nums"
                    style={{ color: "hsl(22 72% 48%)" }}
                  >
                    {(modal.product.selling_price ?? 0).toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Prix d&apos;achat
                  </p>
                  <p className="font-semibold tabular-nums">
                    {(modal.product.purchase_price ?? 0).toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Stock actuel
                  </p>
                  <p className="font-semibold">
                    {modal.product.stock_quantity} unités
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Code-barres
                  </p>
                  <p className="font-mono text-xs">
                    {modal.product.barcode || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                    Statut
                  </p>
                  <StatusBadge
                    label={stockStatusLabel(modal.product.stock_status)}
                    variant={stockStatusVariant(modal.product.stock_status)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModal({ type: "none" })}
              >
                Fermer
              </Button>
              {can("manage_products") && (
                <Button
                  onClick={() => {
                    setModal({ type: "none" });
                    navigate(`/products/${modal.product.id}/edit`);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── AlertDialog : Confirmer suppression ─────────────────────────────── */}
      {modal.type === "delete" && (
        <AlertDialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de supprimer{" "}
                <strong>{modal.product.name}</strong>. Cette action est
                irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── AlertDialog : Confirmer suppression en masse ─────────────────────── */}
      {modal.type === "delete-selection" && (
        <AlertDialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer {modal.ids.length} produit{modal.ids.length > 1 ? "s" : ""} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de supprimer{" "}
                <strong>{modal.ids.length} produit{modal.ids.length > 1 ? "s" : ""}</strong>.
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDeleteSelection}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// ─── ProductCard component ────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  animIndex?: number;
}

function ProductCard({
  product,
  canManage,
  onEdit,
  onDelete,
  onView,
  animIndex = 0,
}: ProductCardProps) {
  return (
    <div
      className="group relative overflow-hidden cursor-pointer"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
        animation: `slideInUp 0.35s ease both`,
        animationDelay: `${animIndex * 60}ms`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = "0 12px 32px hsl(22 30% 15% / 0.12)";
        el.style.borderColor = "hsl(22 72% 48% / 0.35)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)";
        el.style.borderColor = "hsl(var(--border))";
      }}
      onClick={onView}
    >
      {/* ── Image zone ──────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "4/3",
          background: "hsl(var(--muted))",
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package
              className="w-12 h-12"
              style={{ color: "hsl(var(--muted-foreground)/0.25)" }}
            />
          </div>
        )}

        {/* Stock badge en overlay — top right */}
        <div className="absolute top-2 right-2">
          <StockOverlayBadge product={product} />
        </div>

        {/* Quick actions overlay */}
        <div
          className="absolute inset-0 flex items-end justify-center gap-2 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background:
              "linear-gradient(to top, hsl(22 25% 10% / 0.55) 0%, transparent 55%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1.5 rounded-lg transition-colors"
            title="Voir les détails"
            style={{
              background: "hsl(0 0% 100% / 0.15)",
              backdropFilter: "blur(6px)",
              color: "white",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canManage && (
            <>
              <button
                className="p-1.5 rounded-lg transition-colors"
                title="Modifier"
                style={{
                  background: "hsl(0 0% 100% / 0.15)",
                  backdropFilter: "blur(6px)",
                  color: "white",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1.5 rounded-lg transition-colors"
                title="Supprimer"
                style={{
                  background: "hsl(4 72% 52% / 0.75)",
                  backdropFilter: "blur(6px)",
                  color: "white",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Info produit ────────────────────────────────────────────────────── */}
      <div className="p-3.5">
        <p className="font-semibold text-sm text-foreground truncate leading-snug mb-0.5">
          {product.name}
        </p>
        <p className="text-xs text-muted-foreground mb-2.5 truncate">
          {product.category_name ?? "—"}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span
            className="font-black text-sm tabular-nums"
            style={{
              fontFamily: "'Fraunces', 'Georgia', serif",
              background: "linear-gradient(135deg, hsl(22 72% 42%), hsl(36 88% 52%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {(product.selling_price ?? 0).toLocaleString("fr-FR")} FCFA
          </span>
          {product.barcode && (
            <span className="text-[10px] font-mono text-muted-foreground/45 truncate">
              {product.barcode}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
