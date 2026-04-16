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
} from "lucide-react";
import { ProductIcon } from "@/components/ui/ProductIcon";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTableManager } from "@/hooks/useTableManager";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "Alimentaire" | "Boissons" | "Hygiène" | "Entretien" | "Autre";

interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: Category;
  image?: string; // base64 data URL (uploaded image)
  notes?: string;
}

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "Lait Nido 400g", barcode: "6001068002802", price: 3500, stock: 3, category: "Alimentaire" },
  { id: 2, name: "Huile Dinor 1L", barcode: "6001068002819", price: 2500, stock: 5, category: "Alimentaire" },
  { id: 3, name: "Riz Uncle Ben's 5kg", barcode: "6001068002826", price: 8000, stock: 2, category: "Alimentaire" },
  { id: 4, name: "Coca-Cola 1.5L", barcode: "5449000000996", price: 1200, stock: 45, category: "Boissons" },
  { id: 5, name: "Savon Palmolive", barcode: "8714789763378", price: 800, stock: 4, category: "Hygiène" },
  { id: 6, name: "Pâtes Panzani 500g", barcode: "3038350012005", price: 1500, stock: 22, category: "Alimentaire" },
  { id: 7, name: "Sucre en poudre 1kg", barcode: "3256220010015", price: 1000, stock: 30, category: "Alimentaire" },
  { id: 8, name: "Eau Tangui 1.5L", barcode: "6291041500213", price: 500, stock: 60, category: "Boissons" },
  { id: 9, name: "Biscuits Belvita", barcode: "7622300689421", price: 1800, stock: 15, category: "Alimentaire" },
  { id: 10, name: "Détergent Omo 1kg", barcode: "8717163711040", price: 3200, stock: 8, category: "Entretien" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "view"; product: Product }
  | { type: "delete"; product: Product };

const CATEGORY_FILTER_OPTIONS = [
  { value: "Alimentaire", label: "Alimentaire" },
  { value: "Boissons", label: "Boissons" },
  { value: "Hygiène", label: "Hygiène" },
  { value: "Entretien", label: "Entretien" },
  { value: "Autre", label: "Autre" },
];

export default function ProductsPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [categoryFilter, setCategoryFilter] = useState("");

  // Données filtrées par catégorie (avant le pipeline du hook)
  const categoryFiltered = categoryFilter
    ? products.filter((p) => p.category === categoryFilter)
    : products;

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

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleDelete() {
    if (modal.type !== "delete") return;
    setProducts((prev) => prev.filter((p) => p.id !== modal.product.id));
    setModal({ type: "none" });
  }

  function handleDeleteSelection() {
    setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    clearSelection();
  }

  function handleExport() {
    const cols = [
      { key: "name", label: "Nom" },
      { key: "barcode", label: "Code-barres" },
      { key: "category", label: "Catégorie" },
      { key: "price", label: "Prix (FCFA)" },
      { key: "stock", label: "Stock" },
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
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <SearchInput
            placeholder="Rechercher un produit ou code-barres..."
            value={search}
            onChange={setSearch}
          />
          <Button
            className="shrink-0 sm:ml-auto"
            onClick={() => navigate("/products/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un produit
          </Button>
        </div>

        {/* Barre d'outils tableau */}
        <TableToolbar
          showCheckbox
          isAllSelected={isAllSelected(allPageIds)}
          isIndeterminate={isIndeterminate(allPageIds)}
          onToggleAll={() => toggleAll(allPageIds)}
          selectedCount={selectedIds.size}
          bulkActions={
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelection}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Supprimer la sélection
            </Button>
          }
          filterValue={categoryFilter}
          filterOptions={CATEGORY_FILTER_OPTIONS}
          filterPlaceholder="Toutes catégories"
          onFilterChange={(val) => {
            setCategoryFilter(val);
            clearSelection();
          }}
          showExport
          onExport={handleExport}
        />

        {/* Table */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 px-4">
                    <span className="sr-only">Sélection</span>
                  </th>
                  <SortableHeader label="Produit" sortKey="name" currentSort={sort} onSort={toggleSort} />
                  <th>Code-barres</th>
                  <th>Catégorie</th>
                  <SortableHeader label="Prix" sortKey="price" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Stock" sortKey="stock" currentSort={sort} onSort={toggleSort} />
                  <th>Statut</th>
                  <th className="w-28 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {typedPaginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun produit trouvé.
                    </td>
                  </tr>
                )}
                {typedPaginated.map((product) => (
                  <tr
                    key={product.id}
                    className={isSelected(product.id) ? "bg-primary/5" : undefined}
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
                        {product.image ? (
                          <div className="w-8 h-8 rounded overflow-hidden shrink-0">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <ProductIcon
                            name={product.name}
                            category={product.category}
                            size="sm"
                          />
                        )}
                        <span className="font-medium truncate min-w-0">{product.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{product.barcode || "—"}</td>
                    <td>{product.category}</td>
                    <td className="font-medium">{product.price.toLocaleString("fr-FR")} FCFA</td>
                    <td>{product.stock}</td>
                    <td>
                      {product.stock <= 5 ? (
                        <StatusBadge label="Critique" variant="danger" />
                      ) : product.stock <= 15 ? (
                        <StatusBadge label="Bas" variant="warning" />
                      ) : (
                        <StatusBadge label="Normal" variant="success" />
                      )}
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
                        <button
                          className="p-2 rounded-md hover:bg-secondary"
                          title="Modifier"
                          onClick={() => navigate(`/products/${product.id}/edit`)}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          className="p-2 rounded-md hover:bg-destructive/10"
                          title="Supprimer"
                          onClick={() => setModal({ type: "delete", product })}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
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
                {modal.product.image ? (
                  <div className="w-24 h-24 rounded-xl overflow-hidden">
                    <img
                      src={modal.product.image}
                      alt={modal.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <ProductIcon
                    name={modal.product.name}
                    category={modal.product.category}
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
                  <p className="font-medium">{modal.product.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Prix</p>
                  <p className="font-medium">{modal.product.price.toLocaleString("fr-FR")} FCFA</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Stock actuel</p>
                  <p className="font-medium">{modal.product.stock} unités</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Code-barres</p>
                  <p className="font-mono text-xs">{modal.product.barcode || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Statut</p>
                  {modal.product.stock <= 5 ? (
                    <StatusBadge label="Critique" variant="danger" />
                  ) : modal.product.stock <= 15 ? (
                    <StatusBadge label="Bas" variant="warning" />
                  ) : (
                    <StatusBadge label="Normal" variant="success" />
                  )}
                </div>
              </div>

              {modal.product.notes && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Notes</p>
                  <p className="text-sm bg-muted rounded-md px-3 py-2">{modal.product.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModal({ type: "none" })}
              >
                Fermer
              </Button>
              <Button
                onClick={() => {
                  setModal({ type: "none" });
                  navigate(`/products/${modal.product.id}/edit`);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </Button>
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
