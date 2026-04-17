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
} from "lucide-react";
import { exportProducts } from "@/lib/exportProducts";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
  | { type: "delete"; product: Product };

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

  const categoryFilterOptions = (categoriesData ?? []).map((c) => ({
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
    onError: () => {
      toast.error("Erreur lors de la suppression", {
        description: "Impossible de supprimer ce produit. Réessayez.",
      });
    },
  });

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

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDelete() {
    if (modal.type !== "delete") return;
    deleteMutation.mutate(modal.product.id);
  }

  function handleDeleteSelection() {
    const ids = Array.from(selectedIds) as number[];
    Promise.all(ids.map((id) => productService.delete(id)))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success(`${ids.length} produit(s) supprimé(s)`);
        clearSelection();
      })
      .catch(() => {
        toast.error("Erreur lors de la suppression", {
          description: "Certains produits n'ont pas pu être supprimés.",
        });
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
        {/* Header de page premium */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              Catalogue produits
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? (
                <span className="opacity-60">Chargement…</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {products.length}
                  </span>{" "}
                  produit{products.length !== 1 ? "s" : ""} référencé
                  {products.length !== 1 ? "s" : ""}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportProducts(products)}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exporter Excel
            </Button>
            {can('manage_products') && (
              <Button
                size="sm"
                className="rounded-lg shadow-sm shadow-primary/20 bg-gradient-to-br from-primary to-primary/85 hover:from-primary hover:to-primary text-primary-foreground"
                onClick={() => navigate("/products/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
            )}
          </div>
        </div>

        {/* Barre de filtres — card horizontale */}
        <div className="bg-card border rounded-xl shadow-sm p-2.5 sm:p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchInput
              placeholder="Rechercher un produit ou code-barres..."
              value={search}
              onChange={setSearch}
            />
          </div>
          {/* Toggle Liste / Grille */}
          <div className="flex gap-1 border rounded-lg p-1 bg-muted/30 shrink-0">
            <button
              aria-label="Vue liste"
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "list"
                  ? "bg-card shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              aria-label="Vue grille"
              onClick={() => setView("grid")}
              className={cn(
                "p-1.5 rounded transition-colors",
                viewMode === "grid"
                  ? "bg-card shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
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
            can('manage_products') ? (
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

        {/* ── Vue grille ─────────────────────────────────────────────────────── */}
        {viewMode === "grid" && (
          <div>
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && typedPaginated.length === 0 && (
              <div className="rounded-xl border bg-card py-10 flex flex-col items-center gap-2 text-muted-foreground">
                <Package className="w-8 h-8 opacity-40" />
                <p className="text-sm">Aucun produit trouvé.</p>
              </div>
            )}
            {!isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {typedPaginated.map((product) => (
                  <div
                    key={product.id}
                    className="group relative rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer p-3 flex flex-col"
                  >
                    {/* Icône produit */}
                    <div className="aspect-square bg-muted/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ProductIcon
                          name={product.name}
                          category={product.category_name}
                          size="lg"
                        />
                      )}
                    </div>

                    {/* Infos */}
                    <p className="font-semibold text-sm line-clamp-2 leading-snug mb-0.5">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2 truncate">
                      {product.category_name}
                    </p>

                    {/* Prix */}
                    <p
                      className="font-black tabular-nums text-sm mb-2"
                      style={{ color: "hsl(var(--primary))" }}
                    >
                      {product.selling_price.toLocaleString("fr-FR")} FCFA
                    </p>

                    {/* Badge stock */}
                    <div className="mt-auto">
                      <StatusBadge
                        label={stockStatusLabel(product.stock_status)}
                        variant={stockStatusVariant(product.stock_status)}
                      />
                    </div>

                    {/* Actions au hover */}
                    {can('manage_products') && (
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 rounded-md bg-card shadow-sm border hover:bg-secondary"
                          title="Modifier"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/products/${product.id}/edit`);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          className="p-1.5 rounded-md bg-card shadow-sm border hover:bg-destructive/10"
                          title="Supprimer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: "delete", product });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile cards — md:hidden */}
        <div className={cn("space-y-2", viewMode === "grid" ? "hidden" : "md:hidden")}>
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && typedPaginated.length === 0 && (
            <div className="bg-card border rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <Package className="w-8 h-8 opacity-40" />
              <p className="text-sm">Aucun produit trouvé.</p>
            </div>
          )}
          {!isLoading &&
            typedPaginated.map((product) => (
              <div
                key={product.id}
                className={`bg-card border rounded-xl p-4 flex items-start justify-between gap-3 ${
                  isSelected(product.id) ? "ring-1 ring-primary/30 bg-primary/5" : ""
                }`}
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
                    <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
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
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {product.category_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "hsl(var(--primary))" }}
                      >
                        {product.selling_price.toLocaleString("fr-FR")} FCFA
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
                    className="p-2 rounded-md hover:bg-secondary"
                    title="Voir les détails"
                    onClick={() => setModal({ type: "view", product })}
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {can('manage_products') && (
                    <button
                      className="p-2 rounded-md hover:bg-secondary"
                      title="Modifier"
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  {can('manage_products') && (
                    <button
                      className="p-2 rounded-md hover:bg-destructive/10"
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

        {/* Desktop table — hidden md:block */}
        <div className={cn("bg-card rounded-xl border shadow-sm overflow-hidden", viewMode === "grid" ? "hidden" : "hidden md:block")}>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="data-table">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
                <tr>
                  <th className="w-10 px-4">
                    <span className="sr-only">Sélection</span>
                  </th>
                  <SortableHeader label="Produit" sortKey="name" currentSort={sort} onSort={toggleSort} />
                  <th>Code-barres</th>
                  <th>Catégorie</th>
                  <SortableHeader label="Prix vente" sortKey="selling_price" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Stock" sortKey="stock_quantity" currentSort={sort} onSort={toggleSort} />
                  <th>Statut</th>
                  <th className="w-28 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="text-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                )}
                {!isLoading && typedPaginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun produit trouvé.
                    </td>
                  </tr>
                )}
                {!isLoading && typedPaginated.map((product, idx) => (
                  <tr
                    key={product.id}
                    className={
                      isSelected(product.id)
                        ? "bg-primary/5"
                        : idx % 2 === 1
                          ? "bg-muted/20"
                          : undefined
                    }
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
                          <div className="w-8 h-8 rounded overflow-hidden shrink-0">
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
                        <span className="font-medium truncate min-w-0">{product.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{product.barcode || "—"}</td>
                    <td>{product.category_name}</td>
                    <td className="font-medium">
                      {product.selling_price.toLocaleString("fr-FR")} FCFA
                    </td>
                    <td>{product.stock_quantity}</td>
                    <td>
                      <StatusBadge
                        label={stockStatusLabel(product.stock_status)}
                        variant={stockStatusVariant(product.stock_status)}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1 pr-2">
                        <button
                          className="p-2 rounded-md hover:bg-secondary"
                          title="Voir les détails"
                          onClick={() => setModal({ type: "view", product })}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {can('manage_products') && (
                          <button
                            className="p-2 rounded-md hover:bg-secondary"
                            title="Modifier"
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                        {can('manage_products') && (
                          <button
                            className="p-2 rounded-md hover:bg-destructive/10"
                            title="Supprimer"
                            onClick={() => setModal({ type: "delete", product })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        )}
                        <button
                          className="p-2 rounded-md hover:bg-secondary"
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
                  <div className="w-24 h-24 rounded-xl overflow-hidden">
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
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Nom</p>
                  <p className="font-medium">{modal.product.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Catégorie</p>
                  <p className="font-medium">{modal.product.category_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Prix de vente</p>
                  <p className="font-medium">
                    {modal.product.selling_price.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Prix d'achat</p>
                  <p className="font-medium">
                    {modal.product.purchase_price.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Stock actuel</p>
                  <p className="font-medium">{modal.product.stock_quantity} unités</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Code-barres</p>
                  <p className="font-mono text-xs">{modal.product.barcode || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Statut</p>
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
              {can('manage_products') && (
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
              <AlertDialogCancel>Annuler</AlertDialogCancel>
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
    </>
  );
}
