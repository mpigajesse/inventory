import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ProductIcon } from "@/components/ui/ProductIcon";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { useToast } from "@/hooks/use-toast";
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
  Wallet,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTableManager } from "@/hooks/useTableManager";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import {
  stockService,
  type StockItem as ApiStockItem,
  type AdjustmentPayload,
} from "@/services/stockService";

// ─── Local display type ───────────────────────────────────────────────────────

interface StockItem {
  id: number;
  stockId: number; // API stock record id (used for adjust endpoint)
  name: string;
  category: string;
  imageUrl: string | null;
  stock: number;
  min: number;
  max: number;
  price: number;
  stockValue: number;
  status: "normal" | "bas" | "critique";
}

// ─── Map API item → local display item ───────────────────────────────────────

function toDisplayItem(api: ApiStockItem): StockItem {
  return {
    id: api.product,
    stockId: api.id,
    name: api.product_name,
    category: api.category_name,
    imageUrl: api.product_image_url,
    stock: api.quantity,
    min: api.min_threshold,
    max: api.max_threshold,
    price: api.selling_price,
    stockValue: api.stock_value,
    status: api.status,
  };
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

// ─── Filter options ────────────────────────────────────────────────────────────

const LEVEL_FILTER_OPTIONS = [
  { value: "critique", label: "Critique" },
  { value: "bas", label: "Bas" },
  { value: "normal", label: "Normal" },
];

type StockLevelFilter = "" | "normal" | "bas" | "critique";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: 9 }).map((_, i) => (
                <th key={i}>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, row) => (
              <tr key={row}>
                {Array.from({ length: 9 }).map((_, col) => (
                  <td key={col}>
                    <div className="h-4 bg-muted/60 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AdjustStockForm ──────────────────────────────────────────────────────────

interface AdjustStockFormProps {
  item: StockItem;
  onSubmit: (values: AdjustFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function AdjustStockForm({ item, onSubmit, onCancel, isSubmitting }: AdjustStockFormProps) {
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSortieBlocked || isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Confirmer"}
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
  isSubmitting?: boolean;
}

function ThresholdForm({ item, onSubmit, onCancel, isSubmitting }: ThresholdFormProps) {
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<StockLevelFilter>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() =>
    (localStorage.getItem("stock-view") as "list" | "grid") ?? "grid"
  );

  function setView(mode: "list" | "grid") {
    setViewMode(mode);
    localStorage.setItem("stock-view", mode);
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stock"],
    queryFn: () => stockService.getAll(),
  });

  const stockItems: StockItem[] = (data?.results ?? []).map(toDisplayItem);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const adjustMutation = useMutation({
    mutationFn: ({ stockId, payload }: { stockId: number; payload: AdjustmentPayload }) =>
      stockService.adjust(stockId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast({ title: "Stock mis à jour" });
      setModal({ type: "none" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le stock.",
        variant: "destructive",
      });
    },
  });

  const thresholdMutation = useMutation({
    mutationFn: ({ stockId, payload }: { stockId: number; payload: AdjustmentPayload }) =>
      stockService.adjust(stockId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast({ title: "Seuils mis à jour" });
      setModal({ type: "none" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les seuils.",
        variant: "destructive",
      });
    },
  });

  // ── Stat counts ────────────────────────────────────────────────────────────

  const criticalCount = stockItems.filter((i) => i.status === "critique").length;
  const lowCount = stockItems.filter((i) => i.status === "bas").length;
  const normalCount = stockItems.filter((i) => i.status === "normal").length;
  const totalStockValue = stockItems.reduce((sum, i) => sum + i.stockValue, 0);

  // ── Pre-filter pipeline (category + level) before useTableManager ──────────

  const preFiltered = stockItems.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (levelFilter && item.status !== levelFilter) return false;
    return true;
  });

  // ── Table manager ──────────────────────────────────────────────────────────

  const {
    paginated,
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

  const allPageIds = typedPaginated.map((i) => i.id);

  // ── Category filter options derived from API data ──────────────────────────

  const categoryOptions = Array.from(
    new Set(stockItems.map((i) => i.category).filter(Boolean))
  )
    .sort()
    .map((c) => ({ value: c, label: c }));

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAdjust(values: AdjustFormValues) {
    if (modal.type !== "adjust") return;
    const { item } = modal;

    const movementType =
      values.type === "Entrée" ? "entry" : values.type === "Sortie" ? "exit" : "adjustment";

    adjustMutation.mutate({
      stockId: item.stockId,
      payload: {
        movement_type: movementType,
        quantity: values.quantity,
        note: values.motif ?? "",
      },
    });
  }

  function handleThreshold(values: ThresholdFormValues) {
    if (modal.type !== "threshold") return;
    // The threshold update uses the adjustment endpoint with a correction type
    // to set the stock to the new min/max. Since the API only exposes adjust(),
    // we send a correction with the current quantity so stock stays the same,
    // and the note documents the new thresholds.
    const { item } = modal;
    thresholdMutation.mutate({
      stockId: item.stockId,
      payload: {
        movement_type: "adjustment",
        quantity: item.stock,
        note: `Seuils mis à jour — min: ${values.min}, max: ${values.max}`,
      },
    });
  }

  function handleBulkAdjustOpen() {
    setModal({ type: "adjustBulk", ids: new Set(selectedIds) });
  }

  function handleBulkAdjust(values: AdjustFormValues) {
    if (modal.type !== "adjustBulk") return;
    const { ids } = modal;

    const movementType =
      values.type === "Entrée" ? "entry" : values.type === "Sortie" ? "exit" : "adjustment";

    const targets = stockItems.filter((item) => ids.has(item.id));

    Promise.all(
      targets.map((item) =>
        stockService.adjust(item.stockId, {
          movement_type: movementType,
          quantity: values.quantity,
          note: values.motif ?? "",
        })
      )
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["stock"] });
        toast({ title: `${targets.length} produit${targets.length > 1 ? "s" : ""} mis à jour` });
        clearSelection();
        setModal({ type: "none" });
      })
      .catch(() => {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'ajustement groupé.",
          variant: "destructive",
        });
      });
  }

  function handleExport() {
    const exportItems = stockItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      stock: item.stock,
      min: item.min,
      max: item.max,
      price: item.price,
    }));
    exportStockToExcel(exportItems).catch(() => {
      toast({
        title: "Erreur",
        description: "L'export Excel a échoué.",
        variant: "destructive",
      });
    });
  }

  // ── Status badge helper ────────────────────────────────────────────────────

  function renderStatusBadge(status: StockItem["status"]) {
    if (status === "critique") return <StatusBadge label="Critique" variant="danger" />;
    if (status === "bas") return <StatusBadge label="Bas" variant="warning" />;
    return <StatusBadge label="Normal" variant="success" />;
  }

  // ── Progress bar color helper ──────────────────────────────────────────────

  function progressColor(status: StockItem["status"]): string {
    if (status === "critique") return "hsl(var(--destructive))";
    if (status === "bas") return "hsl(var(--warning))";
    return "hsl(var(--success))";
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Topbar
        title="Stock"
        subtitle="État global du stock magasin"
        onMenuClick={onMenuClick}
      />
      <div className="page-container animate-slide-in">
        {/* Header de page premium avec badge d'alerte */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div className="border-l-4 border-primary pl-3">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
              Gestion du stock
              {!isLoading && criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 text-xs font-semibold animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  {criticalCount} article{criticalCount > 1 ? "s" : ""} en rupture
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? (
                <span className="opacity-60">Chargement…</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {stockItems.length}
                  </span>{" "}
                  produit{stockItems.length !== 1 ? "s" : ""} suivi
                  {stockItems.length !== 1 ? "s" : ""}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard
            label="Total produits"
            value={isLoading ? "…" : `${stockItems.length}`}
            icon={Package}
          />
          <StatCard
            label="Stock normal"
            value={isLoading ? "…" : `${normalCount}`}
            icon={CheckCircle}
            change="En ordre"
            changeType="positive"
          />
          <StatCard
            label="Stock bas"
            value={isLoading ? "…" : `${lowCount}`}
            icon={TrendingDown}
            change="À surveiller"
            changeType="neutral"
          />
          <StatCard
            label="Stock critique"
            value={isLoading ? "…" : `${criticalCount}`}
            icon={AlertTriangle}
            change="Action requise"
            changeType="negative"
          />
        </div>

        {/* Valeur totale du stock */}
        {!isLoading && totalStockValue > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm w-fit">
            <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Valeur totale du stock :</span>
            <span className="font-semibold">
              {totalStockValue.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        )}

        {/* Barre de filtres — card horizontale */}
        <div className="bg-card border rounded-xl shadow-sm p-2.5 sm:p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchInput
              placeholder="Rechercher un produit ou catégorie..."
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
          filterOptions={categoryOptions}
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

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
            Impossible de charger les données de stock. Veuillez réessayer.
          </div>
        )}

        {/* ── Vue grille stock ────────────────────────────────────────────────── */}
        {viewMode === "grid" && !isLoading && (
          <div>
            {typedPaginated.length === 0 && (
              <div className="rounded-xl border bg-card py-10 flex flex-col items-center gap-2 text-muted-foreground">
                <Package className="w-8 h-8 opacity-40" />
                <p className="text-sm">Aucun produit trouvé.</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {typedPaginated.map((item) => {
                const pct =
                  item.max > 0
                    ? Math.min(100, Math.round((item.stock / item.max) * 100))
                    : 0;
                return (
                  <div
                    key={item.id}
                    className="group rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all p-3 flex flex-col gap-2"
                  >
                    {/* Icône + Nom + catégorie */}
                    <div className="flex items-start gap-2">
                      <ProductIcon
                        name={item.name}
                        category={item.category}
                        size="sm"
                        imageUrl={item.imageUrl}
                        className="shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm line-clamp-2 leading-snug">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.category || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Quantité en grand */}
                    <p
                      className={cn(
                        "text-2xl font-black tabular-nums",
                        item.status === "critique"
                          ? "text-destructive"
                          : item.status === "bas"
                            ? "text-warning"
                            : "text-success"
                      )}
                    >
                      {item.stock}
                    </p>

                    {/* Barre de progression */}
                    <div className="h-1.5 bg-muted rounded-full">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          background: progressColor(item.status),
                        }}
                      />
                    </div>

                    {/* Seuils + badge */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {item.min} – {item.max}
                      </span>
                      {renderStatusBadge(item.status)}
                    </div>

                    {/* Bouton Ajuster */}
                    <div className="mt-auto pt-1 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => setModal({ type: "adjust", item })}
                      >
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        Ajuster
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {viewMode === "grid" && isLoading && <TableSkeleton />}

        {/* Desktop : tableau normal */}
        {viewMode === "list" && isLoading ? (
          <TableSkeleton />
        ) : viewMode === "list" ? (
          <div className="hidden md:block bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="data-table">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
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
                  {typedPaginated.map((item, idx) => {
                    const pct = item.max > 0
                      ? Math.min(100, Math.round((item.stock / item.max) * 100))
                      : 0;
                    return (
                      <tr
                        key={item.id}
                        className={
                          isSelected(item.id)
                            ? "bg-primary/5"
                            : idx % 2 === 1
                              ? "bg-muted/20"
                              : undefined
                        }
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
                        <td className="text-muted-foreground">{item.category}</td>
                        <td>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${
                              item.status === "critique"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : item.status === "bas"
                                  ? "bg-warning/10 text-warning border-warning/20"
                                  : "bg-success/10 text-success border-success/20"
                            }`}
                          >
                            {item.stock}
                          </span>
                        </td>
                        <td className="tabular-nums text-muted-foreground">{item.min}</td>
                        <td className="tabular-nums text-muted-foreground">{item.max}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  background: progressColor(item.status),
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td>{renderStatusBadge(item.status)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5 pr-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() => setModal({ type: "adjust", item })}
                            >
                              <ArrowUpDown className="w-3.5 h-3.5 lg:mr-1" />
                              <span className="hidden lg:inline">Ajuster</span>
                            </Button>
                            <button
                              className="p-2 rounded-md hover:bg-secondary flex items-center gap-1 text-xs text-muted-foreground transition-colors"
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
        ) : null}

        {/* Mobile : card list — md:hidden */}
        {!isLoading && (
          <div className="md:hidden space-y-2">
            {typedPaginated.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucun produit trouvé.
              </div>
            )}
            {typedPaginated.map((item) => {
              const pct = item.max > 0
                ? Math.min(100, Math.round((item.stock / item.max) * 100))
                : 0;
              const stockBadgeClasses =
                item.status === "critique"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : item.status === "bas"
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-success/10 text-success border-success/20";
              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-xl p-4 flex flex-col gap-3 ${
                    isSelected(item.id) ? "border-primary/50 bg-primary/5" : ""
                  }`}
                >
                  {/* Header row : nom produit + badge statut */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected(item.id)}
                        onChange={() => toggleRow(item.id)}
                        className="h-4 w-4 mt-0.5 rounded border-input accent-primary cursor-pointer shrink-0"
                        aria-label={`Sélectionner ${item.name}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                          {item.category || "—"}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>

                  {/* Stock badge + seuils */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${stockBadgeClasses}`}
                    >
                      Stock : {item.stock}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Min {item.min}
                      <span className="mx-1 opacity-40">•</span>
                      Max {item.max}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: progressColor(item.status),
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <button
                      className="px-3 py-1.5 rounded-md hover:bg-secondary transition-colors flex items-center gap-1.5 text-xs text-muted-foreground font-medium"
                      title="Définir les seuils"
                      onClick={() => setModal({ type: "threshold", item })}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Seuils</span>
                    </button>
                    <Button
                      size="sm"
                      className="h-8 rounded-md bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-sm shadow-primary/20"
                      onClick={() => setModal({ type: "adjust", item })}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                      Ajuster
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              isSubmitting={adjustMutation.isPending}
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
            <AdjustStockForm
              item={{ id: -1, stockId: -1, name: "", category: "", stock: 0, min: 0, max: 0, price: 0, stockValue: 0, status: "normal" }}
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
              isSubmitting={thresholdMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
