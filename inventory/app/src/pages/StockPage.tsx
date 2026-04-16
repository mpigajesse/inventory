import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TableToolbar } from "@/components/ui/TableToolbar";
import { exportStockToExcel } from "@/lib/exportStock";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  ArrowUpDown,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTableManager } from "@/hooks/useTableManager";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  min: number;
  max: number;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const adjustSchema = z.object({
  type: z.enum(["Entrée", "Sortie", "Correction"], {
    required_error: "Le type est requis",
  }),
  quantity: z
    .number({ invalid_type_error: "La quantité doit être un nombre" })
    .int("La quantité doit être un entier")
    .min(1, "La quantité doit être au moins 1"),
  motif: z.string().optional(),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

const thresholdSchema = z.object({
  min: z
    .number({ invalid_type_error: "Le minimum doit être un nombre" })
    .int()
    .min(0, "Le minimum ne peut pas être négatif"),
  max: z
    .number({ invalid_type_error: "Le maximum doit être un nombre" })
    .int()
    .min(1, "Le maximum doit être au moins 1"),
}).refine((d) => d.max > d.min, {
  message: "Le maximum doit être supérieur au minimum",
  path: ["max"],
});

type ThresholdFormValues = z.infer<typeof thresholdSchema>;

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_STOCK: StockItem[] = [
  { id: 1, name: "Lait Nido 400g", category: "Alimentaire", stock: 3, min: 10, max: 50 },
  { id: 2, name: "Huile Dinor 1L", category: "Alimentaire", stock: 5, min: 15, max: 40 },
  { id: 3, name: "Riz Uncle Ben's 5kg", category: "Alimentaire", stock: 2, min: 8, max: 30 },
  { id: 4, name: "Coca-Cola 1.5L", category: "Boissons", stock: 45, min: 20, max: 100 },
  { id: 5, name: "Savon Palmolive", category: "Hygiène", stock: 4, min: 12, max: 50 },
  { id: 6, name: "Pâtes Panzani 500g", category: "Alimentaire", stock: 22, min: 10, max: 40 },
  { id: 7, name: "Sucre en poudre 1kg", category: "Alimentaire", stock: 30, min: 15, max: 60 },
  { id: 8, name: "Eau Tangui 1.5L", category: "Boissons", stock: 60, min: 25, max: 100 },
  { id: 9, name: "Biscuits Belvita", category: "Alimentaire", stock: 15, min: 10, max: 30 },
  { id: 10, name: "Détergent Omo 1kg", category: "Entretien", stock: 8, min: 10, max: 30 },
];

// ─── Filter options ────────────────────────────────────────────────────────────

const CATEGORY_FILTER_OPTIONS = [
  { value: "Alimentaire", label: "Alimentaire" },
  { value: "Boissons", label: "Boissons" },
  { value: "Hygiène", label: "Hygiène" },
  { value: "Entretien", label: "Entretien" },
];

type StockLevelFilter = "" | "Critique" | "Bas" | "Normal";

function getStockLevel(item: StockItem): "Critique" | "Bas" | "Normal" {
  if (item.stock <= item.min * 0.5) return "Critique";
  if (item.stock <= item.min) return "Bas";
  return "Normal";
}

// ─── AdjustStockForm ──────────────────────────────────────────────────────────

interface AdjustStockFormProps {
  item: StockItem;
  onSubmit: (values: AdjustFormValues) => void;
  onCancel: () => void;
}

function AdjustStockForm({ item, onSubmit, onCancel }: AdjustStockFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { quantity: 1, motif: "" },
  });

  const watchedType = useWatch({ control, name: "type" });
  const watchedQty = useWatch({ control, name: "quantity" });

  function computeNewStock(): number | null {
    const qty = Number(watchedQty);
    if (!watchedType || isNaN(qty) || qty < 1) return null;
    if (watchedType === "Entrée") return item.stock + qty;
    if (watchedType === "Sortie") return item.stock - qty;
    if (watchedType === "Correction") return qty;
    return null;
  }

  const newStock = computeNewStock();
  const isSortieBlocked =
    watchedType === "Sortie" &&
    watchedQty !== undefined &&
    Number(watchedQty) > item.stock;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 py-4">
        {/* Résumé stock actuel */}
        <div className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Stock actuel</span>
          <span className="font-semibold text-lg">{item.stock}</span>
        </div>

        {/* Type */}
        <div>
          <Label className="text-sm font-medium">
            Type d'ajustement <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrée">Entrée — Approvisionnement</SelectItem>
                  <SelectItem value="Sortie">Sortie — Vente / perte</SelectItem>
                  <SelectItem value="Correction">Correction — Inventaire</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="text-xs text-destructive mt-1">{errors.type.message}</p>
          )}
        </div>

        {/* Quantité */}
        <div>
          <Label htmlFor="quantity" className="text-sm font-medium">
            {watchedType === "Correction" ? "Nouveau stock" : "Quantité"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            placeholder="0"
            className="mt-1"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>
          )}
          {isSortieBlocked && (
            <p className="text-xs text-destructive mt-1">
              Quantité insuffisante — stock actuel : {item.stock}
            </p>
          )}
        </div>

        {/* Aperçu nouveau stock */}
        {newStock !== null && (
          <div
            className={`rounded-lg border px-4 py-3 flex items-center justify-between text-sm transition-colors ${
              isSortieBlocked
                ? "border-destructive bg-destructive/5"
                : newStock < item.min
                ? "border-warning bg-warning/5"
                : "border-success bg-success/5"
            }`}
          >
            <span className="text-muted-foreground">Nouveau stock prévu</span>
            <span
              className={`font-semibold text-lg ${
                isSortieBlocked
                  ? "text-destructive"
                  : newStock < item.min
                  ? "text-warning"
                  : "text-success"
              }`}
            >
              {isSortieBlocked ? "—" : newStock}
            </span>
          </div>
        )}

        {/* Motif */}
        <div>
          <Label htmlFor="motif" className="text-sm font-medium">
            Motif <span className="text-muted-foreground text-xs">(optionnel)</span>
          </Label>
          <Textarea
            id="motif"
            placeholder="Ex: Livraison fournisseur, retour client..."
            className="mt-1 resize-none"
            rows={2}
            {...register("motif")}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSortieBlocked}>
          Confirmer
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── ThresholdForm ────────────────────────────────────────────────────────────

interface ThresholdFormProps {
  item: StockItem;
  onSubmit: (values: ThresholdFormValues) => void;
  onCancel: () => void;
}

function ThresholdForm({ item, onSubmit, onCancel }: ThresholdFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ThresholdFormValues>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: { min: item.min, max: item.max },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 py-4">
        <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
          Stock actuel : <strong className="text-foreground">{item.stock}</strong>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="min" className="text-sm font-medium">
              Stock minimum <span className="text-destructive">*</span>
            </Label>
            <Input
              id="min"
              type="number"
              min={0}
              className="mt-1"
              {...register("min", { valueAsNumber: true })}
            />
            {errors.min && (
              <p className="text-xs text-destructive mt-1">{errors.min.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="max" className="text-sm font-medium">
              Stock maximum <span className="text-destructive">*</span>
            </Label>
            <Input
              id="max"
              type="number"
              min={1}
              className="mt-1"
              {...register("max", { valueAsNumber: true })}
            />
            {errors.max && (
              <p className="text-xs text-destructive mt-1">{errors.max.message}</p>
            )}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">Enregistrer</Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "adjust"; item: StockItem }
  | { type: "adjustBulk"; ids: Set<string | number> }
  | { type: "threshold"; item: StockItem };

export default function StockPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const [items, setItems] = useState<StockItem[]>(INITIAL_STOCK);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<StockLevelFilter>("");

  // ── Stat counts (always from full items list) ──────────────────────────────

  const criticalCount = items.filter((i) => i.stock <= i.min * 0.5).length;
  const lowCount = items.filter((i) => i.stock <= i.min && i.stock > i.min * 0.5).length;
  const normalCount = items.filter((i) => i.stock > i.min).length;

  // ── Pre-filter pipeline (category + level) before useTableManager ──────────

  const preFiltered = items.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (levelFilter && getStockLevel(item) !== levelFilter) return false;
    return true;
  });

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
  } = useTableManager(preFiltered as unknown as Record<string, unknown>[], {
    initialPageSize: 10,
    searchKeys: ["name", "category"] as never[],
  });

  const typedPaginated = paginated as unknown as StockItem[];
  const typedFiltered = filtered as unknown as StockItem[];
  const allPageIds = typedPaginated.map((i) => i.id);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAdjust(values: AdjustFormValues) {
    if (modal.type !== "adjust") return;
    const { item } = modal;

    let newStock: number;
    if (values.type === "Entrée") newStock = item.stock + values.quantity;
    else if (values.type === "Sortie") newStock = item.stock - values.quantity;
    else newStock = values.quantity; // Correction

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, stock: Math.max(0, newStock) } : i))
    );
    setModal({ type: "none" });
  }

  function handleThreshold(values: ThresholdFormValues) {
    if (modal.type !== "threshold") return;
    const { item } = modal;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, min: values.min, max: values.max } : i
      )
    );
    setModal({ type: "none" });
  }

  function handleBulkAdjustOpen() {
    setModal({ type: "adjustBulk", ids: new Set(selectedIds) });
  }

  // Bulk adjust applies the same operation to every selected item
  function handleBulkAdjust(values: AdjustFormValues) {
    if (modal.type !== "adjustBulk") return;
    const { ids } = modal;

    setItems((prev) =>
      prev.map((item) => {
        if (!ids.has(item.id)) return item;
        let newStock: number;
        if (values.type === "Entrée") newStock = item.stock + values.quantity;
        else if (values.type === "Sortie") newStock = item.stock - values.quantity;
        else newStock = values.quantity; // Correction
        return { ...item, stock: Math.max(0, newStock) };
      })
    );
    clearSelection();
    setModal({ type: "none" });
  }

  function handleExport() {
    exportStockToExcel(items).catch(console.error);
  }

  // ── Level filter options ───────────────────────────────────────────────────

  const LEVEL_FILTER_OPTIONS = [
    { value: "Critique", label: "Critique" },
    { value: "Bas", label: "Bas" },
    { value: "Normal", label: "Normal" },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title="Stock"
        subtitle="État global du stock magasin"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total produits" value={`${items.length}`} icon={Package} />
          <StatCard
            label="Stock normal"
            value={`${normalCount}`}
            icon={CheckCircle}
            change="En ordre"
            changeType="positive"
          />
          <StatCard
            label="Stock bas"
            value={`${lowCount}`}
            icon={TrendingDown}
            change="À surveiller"
            changeType="neutral"
          />
          <StatCard
            label="Stock critique"
            value={`${criticalCount}`}
            icon={AlertTriangle}
            change="Action requise"
            changeType="negative"
          />
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <SearchInput
            placeholder="Rechercher un produit ou catégorie..."
            value={search}
            onChange={setSearch}
          />
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
              variant="outline"
              onClick={handleBulkAdjustOpen}
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
              Ajuster la sélection
            </Button>
          }
          filterValue={categoryFilter}
          filterOptions={CATEGORY_FILTER_OPTIONS}
          filterPlaceholder="Toutes catégories"
          onFilterChange={(val) => {
            setCategoryFilter(val);
            clearSelection();
          }}
          extraActions={
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value as StockLevelFilter);
                clearSelection();
              }}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 cursor-pointer min-w-[120px]"
            >
              <option value="">Tous les niveaux</option>
              {LEVEL_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          }
          showExport
          onExport={handleExport}
          exportLabel="Exporter Excel"
          ExportIcon={FileSpreadsheet}
        />

        {/* Desktop : tableau normal */}
        <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10 px-4">
                    <span className="sr-only">Sélection</span>
                  </th>
                  <SortableHeader label="Produit" sortKey="name" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Catégorie" sortKey="category" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Stock actuel" sortKey="stock" currentSort={sort} onSort={toggleSort} />
                  <SortableHeader label="Seuil critique" sortKey="min" currentSort={sort} onSort={toggleSort} />
                  <th>Maximum</th>
                  <th>Niveau</th>
                  <th>Statut</th>
                  <th className="text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {typedPaginated.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                      Aucun produit trouvé.
                    </td>
                  </tr>
                )}
                {typedPaginated.map((item) => {
                  const pct = Math.min(100, Math.round((item.stock / item.max) * 100));
                  return (
                    <tr
                      key={item.id}
                      className={isSelected(item.id) ? "bg-primary/5" : undefined}
                    >
                      <td className="w-10">
                        <input
                          type="checkbox"
                          checked={isSelected(item.id)}
                          onChange={() => toggleRow(item.id)}
                          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                          aria-label={`Sélectionner ${item.name}`}
                        />
                      </td>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.category}</td>
                      <td className="font-medium">{item.stock}</td>
                      <td>{item.min}</td>
                      <td>{item.max}</td>
                      <td>
                        <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background:
                                item.stock <= item.min * 0.5
                                  ? "hsl(var(--destructive))"
                                  : item.stock <= item.min
                                  ? "hsl(var(--warning))"
                                  : "hsl(var(--success))",
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        {item.stock <= item.min * 0.5 ? (
                          <StatusBadge label="Critique" variant="danger" />
                        ) : item.stock <= item.min ? (
                          <StatusBadge label="Bas" variant="warning" />
                        ) : (
                          <StatusBadge label="Normal" variant="success" />
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 pr-2">
                          <button
                            className="p-2 rounded-md hover:bg-secondary flex items-center gap-1 text-xs text-muted-foreground"
                            title="Ajuster le stock"
                            onClick={() => setModal({ type: "adjust", item })}
                          >
                            <ArrowUpDown className="w-4 h-4" />
                            <span className="hidden lg:inline">Ajuster</span>
                          </button>
                          <button
                            className="p-2 rounded-md hover:bg-secondary flex items-center gap-1 text-xs text-muted-foreground"
                            title="Définir les seuils"
                            onClick={() => setModal({ type: "threshold", item })}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden lg:inline">Seuils</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile : card list */}
        <div className="md:hidden space-y-2">
          {typedPaginated.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucun produit trouvé.
            </div>
          )}
          {typedPaginated.map((item) => {
            const pct = Math.min(100, Math.round((item.stock / item.max) * 100));
            return (
              <div
                key={item.id}
                className={`bg-card border rounded-lg p-3 ${isSelected(item.id) ? "border-primary/50 bg-primary/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected(item.id)}
                      onChange={() => toggleRow(item.id)}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                      aria-label={`Sélectionner ${item.name}`}
                    />
                    <span className="font-medium text-sm truncate">{item.name}</span>
                  </div>
                  {item.stock <= item.min * 0.5 ? (
                    <StatusBadge label="Critique" variant="danger" />
                  ) : item.stock <= item.min ? (
                    <StatusBadge label="Bas" variant="warning" />
                  ) : (
                    <StatusBadge label="Normal" variant="success" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground mb-2">
                  <span>Stock : <strong className="text-foreground">{item.stock}</strong></span>
                  <span>Min : <strong className="text-foreground">{item.min}</strong></span>
                  <span>Max : <strong className="text-foreground">{item.max}</strong></span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background:
                        item.stock <= item.min * 0.5
                          ? "hsl(var(--destructive))"
                          : item.stock <= item.min
                          ? "hsl(var(--warning))"
                          : "hsl(var(--success))",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                  <div className="flex gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      title="Ajuster le stock"
                      onClick={() => setModal({ type: "adjust", item })}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      title="Définir les seuils"
                      onClick={() => setModal({ type: "threshold", item })}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* ── Modal : Ajuster le stock (item unique) ───────────────────────────── */}
      {modal.type === "adjust" && (
        <Dialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Ajuster le stock — {modal.item.name}
              </DialogTitle>
            </DialogHeader>
            <AdjustStockForm
              item={modal.item}
              onSubmit={handleAdjust}
              onCancel={() => setModal({ type: "none" })}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal : Ajuster la sélection (bulk) ──────────────────────────────── */}
      {modal.type === "adjustBulk" && (
        <Dialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Ajuster la sélection — {modal.ids.size} produit{modal.ids.size > 1 ? "s" : ""}
              </DialogTitle>
            </DialogHeader>
            {/* Reuse AdjustStockForm with a dummy item — stock display is replaced */}
            <AdjustStockForm
              item={{ id: -1, name: "", category: "", stock: 0, min: 0, max: 0 }}
              onSubmit={handleBulkAdjust}
              onCancel={() => setModal({ type: "none" })}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal : Définir les seuils ───────────────────────────────────────── */}
      {modal.type === "threshold" && (
        <Dialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Définir les seuils — {modal.item.name}
              </DialogTitle>
            </DialogHeader>
            <ThresholdForm
              item={modal.item}
              onSubmit={handleThreshold}
              onCancel={() => setModal({ type: "none" })}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
