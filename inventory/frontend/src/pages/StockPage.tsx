import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/ui/StatCard";
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
import { toast } from "sonner";
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
import { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTableManager } from "@/hooks/useTableManager";
import { usePermissions } from "@/hooks/usePermissions";
import type { AppLayoutContext } from "@/components/layout/AppLayout";
import {
  stockService,
  type StockItem as ApiStockItem,
  type AdjustmentPayload,
} from "@/services/stockService";

// ─── Color palette ────────────────────────────────────────────────────────────

const COLOR = {
  normal:        "hsl(142 72% 38%)",
  normalGrad:    "linear-gradient(135deg, hsl(142 72% 38%), hsl(152 60% 44%))",
  normalBg:      "hsl(142 72% 38% / 0.12)",
  normalBorder:  "hsl(142 72% 38% / 0.30)",
  normalText:    "hsl(142 72% 28%)",
  low:           "hsl(36 88% 52%)",
  lowGrad:       "linear-gradient(135deg, hsl(36 88% 52%), hsl(42 88% 58%))",
  lowBg:         "hsl(36 88% 52% / 0.12)",
  lowBorder:     "hsl(36 88% 52% / 0.30)",
  lowText:       "hsl(36 72% 32%)",
  critical:      "hsl(0 72% 52%)",
  criticalGrad:  "linear-gradient(135deg, hsl(0 72% 52%), hsl(6 72% 58%))",
  criticalBg:    "hsl(0 72% 52% / 0.06)",
  criticalBorder:"hsl(0 72% 52% / 0.30)",
  criticalText:  "hsl(0 72% 42%)",
  barBg:         "hsl(0 0% 94%)",
  copper:        "hsl(22 72% 48%)",
  copperGrad:    "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
  copperGlow:    "0 4px 14px hsl(22 72% 48% / 0.35)",
} as const;

function statusColor(status: "normal" | "bas" | "critique"): string {
  if (status === "critique") return COLOR.critical;
  if (status === "bas") return COLOR.low;
  return COLOR.normal;
}

function statusGrad(status: "normal" | "bas" | "critique"): string {
  if (status === "critique") return COLOR.criticalGrad;
  if (status === "bas") return COLOR.lowGrad;
  return COLOR.normalGrad;
}

function statusBg(status: "normal" | "bas" | "critique"): string {
  if (status === "critique") return COLOR.criticalBg;
  if (status === "bas") return COLOR.lowBg;
  return COLOR.normalBg;
}

function statusBorder(status: "normal" | "bas" | "critique"): string {
  if (status === "critique") return COLOR.criticalBorder;
  if (status === "bas") return COLOR.lowBorder;
  return COLOR.normalBorder;
}

function statusTextColor(status: "normal" | "bas" | "critique"): string {
  if (status === "critique") return COLOR.criticalText;
  if (status === "bas") return COLOR.lowText;
  return COLOR.normalText;
}

function statusLabel(status: "normal" | "bas" | "critique"): string {
  if (status === "critique") return "Critique";
  if (status === "bas") return "Bas";
  return "Normal";
}

// ─── Local display type ───────────────────────────────────────────────────────

interface StockItem {
  id: number;
  stockId: number;
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
    name: api.product_name ?? "—",
    category: api.category_name ?? "—",
    imageUrl: api.product_image_url ?? null,
    stock: Number(api.quantity) || 0,
    min: Number(api.min_threshold) || 0,
    max: Number(api.max_threshold) || 0,
    price: Number(api.selling_price) || 0,
    stockValue: Number(api.stock_value) || 0,
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

type StockLevelFilter = "" | "normal" | "bas" | "critique";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
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

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border p-3 flex flex-col gap-2 animate-pulse">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted/60 rounded w-1/2" />
            </div>
          </div>
          <div className="h-7 bg-muted rounded w-1/3" />
          <div className="h-1.5 bg-muted rounded-full" />
          <div className="flex justify-between">
            <div className="h-3 bg-muted/60 rounded w-1/4" />
            <div className="h-5 bg-muted rounded-full w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StockItem["status"] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{
        background: statusBg(status),
        color: statusTextColor(status),
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
      {statusLabel(status)}
    </span>
  );
}

// ─── Stock bar cell ───────────────────────────────────────────────────────────

function StockBarCell({ item, rowIndex = 0 }: { item: StockItem; rowIndex?: number }) {
  const pct = item.max > 0 ? Math.min(100, Math.round((item.stock / item.max) * 100)) : 0;
  const delay = `${rowIndex * 40 + 200}ms`;
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ fontFamily: "'Fraunces', serif", color: statusColor(item.status) }}
        >
          {item.stock}
        </span>
        <span className="text-[10px] text-muted-foreground">/ {item.max}</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: COLOR.barBg }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: statusGrad(item.status),
            transformOrigin: "left",
            transform: "scaleX(1)",
            animation: `stockBarGrow 0.6s ease-out ${delay} both`,
          }}
        />
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
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between text-sm"
          style={{ background: "hsl(var(--muted))" }}
        >
          <span className="text-muted-foreground">Stock actuel</span>
          <span
            className="font-bold text-lg tabular-nums"
            style={{ fontFamily: "'Fraunces', serif", color: COLOR.copper }}
          >
            {item.stock}
          </span>
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
                <SelectTrigger
                  className="mt-1 w-full focus:ring-2"
                  style={{ "--tw-ring-color": COLOR.copper } as React.CSSProperties}
                >
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
            inputMode="numeric"
            min={1}
            placeholder="0"
            className="mt-1 h-11"
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
            className="rounded-xl border px-4 py-3 flex items-center justify-between text-sm transition-colors"
            style={{
              borderColor: isSortieBlocked
                ? COLOR.critical
                : newStock < item.min
                ? COLOR.low
                : COLOR.normal,
              background: isSortieBlocked
                ? COLOR.criticalBg
                : newStock < item.min
                ? COLOR.lowBg
                : COLOR.normalBg,
            }}
          >
            <span className="text-muted-foreground">Nouveau stock prévu</span>
            <span
              className="font-bold text-lg tabular-nums"
              style={{
                fontFamily: "'Fraunces', serif",
                color: isSortieBlocked
                  ? COLOR.critical
                  : newStock < item.min
                  ? COLOR.low
                  : COLOR.normal,
              }}
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
        <Button
          type="submit"
          disabled={isSortieBlocked || isSubmitting}
          style={{
            background: `linear-gradient(135deg, ${COLOR.copper}, hsl(36 88% 52%))`,
            border: "none",
            color: "white",
          }}
        >
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
        <div
          className="rounded-xl px-4 py-2 text-sm text-muted-foreground"
          style={{ background: "hsl(var(--muted))" }}
        >
          Stock actuel :{" "}
          <strong style={{ fontFamily: "'Fraunces', serif", color: COLOR.copper }}>
            {item.stock}
          </strong>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="min" className="text-sm font-medium">
              Stock minimum <span className="text-destructive">*</span>
            </Label>
            <Input
              id="min"
              type="number"
              inputMode="numeric"
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
              inputMode="numeric"
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
        <Button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: `linear-gradient(135deg, ${COLOR.copper}, hsl(36 88% 52%))`,
            border: "none",
            color: "white",
          }}
        >
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Global health banner ─────────────────────────────────────────────────────

interface HealthBannerProps {
  totalProducts: number;
  totalValue: number;
  normalCount: number;
  lowCount: number;
  criticalCount: number;
  visible?: boolean;
}

function HealthBanner({
  totalProducts,
  totalValue,
  normalCount,
  lowCount,
  criticalCount,
  visible = true,
}: HealthBannerProps) {
  const total = normalCount + lowCount + criticalCount || 1;
  const normalPct = Math.round((normalCount / total) * 100);
  const lowPct = Math.round((lowCount / total) * 100);
  const criticalPct = 100 - normalPct - lowPct;

  return (
    <div
      className="mb-6 p-5 rounded-2xl"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.82)",
        border: "1px solid hsl(var(--border) / 0.6)",
        boxShadow: "0 4px 20px hsl(22 30% 15% / 0.07), 0 1px 4px hsl(22 30% 15% / 0.04)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
      }}
    >
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className="font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading, inherit)" }}
          >
            Santé globale du stock
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">
            {totalProducts} produit{totalProducts !== 1 ? "s" : ""} · Valeur totale :{" "}
            <span
              className="font-semibold"
              style={{ fontFamily: "'Fraunces', serif", color: COLOR.copper }}
            >
              {(Number.isFinite(totalValue) ? totalValue : 0).toLocaleString("fr-FR")} FCFA
            </span>
          </p>
        </div>
        {criticalCount > 0 && (
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full animate-pulse inline-flex items-center gap-1.5 shrink-0"
            style={{
              background: "hsl(0 72% 52% / 0.10)",
              color: "hsl(0 72% 42%)",
              border: "1px solid hsl(0 72% 52% / 0.25)",
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {criticalCount} critique{criticalCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Barre tricolore — 6px, border-radius 100px */}
      <div
        className="flex overflow-hidden mb-4 gap-px"
        style={{ height: "6px", borderRadius: "100px" }}
      >
        {normalPct > 0 && (
          <div
            style={{
              width: `${normalPct}%`,
              background: "hsl(142 72% 38%)",
              borderRadius: lowPct === 0 && criticalPct <= 0 ? "100px" : "100px 0 0 100px",
              transition: "width 0.5s ease-out",
            }}
          />
        )}
        {lowPct > 0 && (
          <div
            style={{
              width: `${lowPct}%`,
              background: "hsl(36 88% 52%)",
              transition: "width 0.5s ease-out",
            }}
          />
        )}
        {criticalPct > 0 && (
          <div
            style={{
              width: `${criticalPct}%`,
              background: "hsl(0 72% 52%)",
              borderRadius: "0 100px 100px 0",
              transition: "width 0.5s ease-out",
            }}
          />
        )}
      </div>

      {/* Counters avec indicateurs colorés enrichis */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "hsl(142 72% 38% / 0.09)", border: "1px solid hsl(142 72% 38% / 0.20)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "hsl(142 72% 38%)", boxShadow: "0 0 0 3px hsl(142 72% 38% / 0.20)" }}
          />
          <span className="text-xs font-semibold" style={{ color: "hsl(142 72% 28%)" }}>
            Normal
          </span>
          <span
            className="text-xs font-black tabular-nums px-1.5 py-0.5 rounded-md"
            style={{ background: "hsl(142 72% 38% / 0.15)", color: "hsl(142 72% 28%)" }}
          >
            {normalCount}
          </span>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "hsl(36 88% 52% / 0.09)", border: "1px solid hsl(36 88% 52% / 0.20)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "hsl(36 88% 52%)", boxShadow: "0 0 0 3px hsl(36 88% 52% / 0.20)" }}
          />
          <span className="text-xs font-semibold" style={{ color: "hsl(36 72% 32%)" }}>
            Bas
          </span>
          <span
            className="text-xs font-black tabular-nums px-1.5 py-0.5 rounded-md"
            style={{ background: "hsl(36 88% 52% / 0.15)", color: "hsl(36 72% 32%)" }}
          >
            {lowCount}
          </span>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: "hsl(0 72% 52% / 0.08)", border: "1px solid hsl(0 72% 52% / 0.20)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: "hsl(0 72% 52%)", boxShadow: "0 0 0 3px hsl(0 72% 52% / 0.20)" }}
          />
          <span className="text-xs font-semibold" style={{ color: "hsl(0 72% 42%)" }}>
            Critique
          </span>
          <span
            className="text-xs font-black tabular-nums px-1.5 py-0.5 rounded-md"
            style={{ background: "hsl(0 72% 52% / 0.15)", color: "hsl(0 72% 42%)" }}
          >
            {criticalCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Level filter pills ───────────────────────────────────────────────────────

interface LevelFilterPillsProps {
  filter: StockLevelFilter;
  onChange: (v: StockLevelFilter) => void;
  total: number;
  normalCount: number;
  lowCount: number;
  criticalCount: number;
}

type PillSpec = {
  key: StockLevelFilter;
  label: string;
  count: number;
  inactiveBg: string;
  inactiveBorder: string;
  inactiveText: string;
  activeGrad: string;
  activeShadow: string;
};

function LevelFilterPills({
  filter,
  onChange,
  total,
  normalCount,
  lowCount,
  criticalCount,
}: LevelFilterPillsProps) {
  const tabs: PillSpec[] = [
    {
      key: "",
      label: "Tous",
      count: total,
      inactiveBg: "hsl(var(--muted))",
      inactiveBorder: "hsl(var(--border))",
      inactiveText: "hsl(var(--muted-foreground))",
      activeGrad: COLOR.copperGrad,
      activeShadow: `0 3px 10px hsl(22 72% 48% / 0.35)`,
    },
    {
      key: "critique",
      label: "Rupture",
      count: criticalCount,
      inactiveBg: "hsl(0 72% 52% / 0.10)",
      inactiveBorder: "hsl(0 72% 52% / 0.28)",
      inactiveText: "hsl(0 72% 42%)",
      activeGrad: "linear-gradient(135deg, hsl(0 72% 52%), hsl(6 72% 58%))",
      activeShadow: "0 3px 10px hsl(0 72% 52% / 0.40)",
    },
    {
      key: "bas",
      label: "Bas",
      count: lowCount,
      inactiveBg: "hsl(36 88% 52% / 0.10)",
      inactiveBorder: "hsl(36 88% 52% / 0.28)",
      inactiveText: "hsl(36 72% 32%)",
      activeGrad: "linear-gradient(135deg, hsl(36 88% 52%), hsl(42 88% 58%))",
      activeShadow: "0 3px 10px hsl(36 88% 52% / 0.40)",
    },
    {
      key: "normal",
      label: "OK",
      count: normalCount,
      inactiveBg: "hsl(142 72% 38% / 0.10)",
      inactiveBorder: "hsl(142 72% 38% / 0.28)",
      inactiveText: "hsl(142 72% 28%)",
      activeGrad: "linear-gradient(135deg, hsl(142 72% 38%), hsl(152 60% 44%))",
      activeShadow: "0 3px 10px hsl(142 72% 38% / 0.40)",
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => {
        const isActive = filter === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="flex items-center gap-2 px-3.5 py-2.5 sm:py-1.5 rounded-full text-xs font-semibold min-h-[44px] sm:min-h-0"
            style={{
              transition: "all 0.22s ease",
              ...(isActive
                ? {
                    background: tab.activeGrad,
                    color: "white",
                    boxShadow: tab.activeShadow,
                    border: "1px solid transparent",
                  }
                : {
                    background: tab.inactiveBg,
                    color: tab.inactiveText,
                    border: `1px solid ${tab.inactiveBorder}`,
                    boxShadow: "none",
                  }),
            }}
          >
            {tab.label}
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: isActive ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.07)",
              }}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
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
  const { can } = usePermissions();

  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<StockLevelFilter>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(() =>
    (localStorage.getItem("stock-view") as "list" | "grid") ?? "grid"
  );
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBannerVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  function setView(mode: "list" | "grid") {
    setViewMode(mode);
    localStorage.setItem("stock-view", mode);
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stock"],
    queryFn: ({ signal }) => stockService.getAll(undefined, signal),
  });

  const stockItems: StockItem[] = (data?.results ?? []).map(toDisplayItem);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const adjustMutation = useMutation({
    mutationFn: ({ stockId, payload }: { stockId: number; payload: AdjustmentPayload }) =>
      stockService.adjust(stockId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Stock mis à jour");
      setModal({ type: "none" });
    },
    onError: () => {
      toast.error("Erreur", {
        description: "Impossible de mettre à jour le stock.",
      });
    },
  });

  const thresholdMutation = useMutation({
    mutationFn: ({ stockId, min, max }: { stockId: number; min: number; max: number }) =>
      stockService.updateThresholds(stockId, { min_threshold: min, max_threshold: max }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Seuils mis à jour");
      setModal({ type: "none" });
    },
    onError: () => {
      toast.error("Erreur", {
        description: "Impossible de mettre à jour les seuils.",
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

  // Key changes whenever filters/search/page change → remounts table → replays stagger
  const tableKey = `${search}|${categoryFilter}|${levelFilter}|${page}|${viewMode}`;

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
    const { item } = modal;
    thresholdMutation.mutate({
      stockId: item.stockId,
      min: values.min,
      max: values.max,
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

    setIsBulkSubmitting(true);
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
        toast.success(`${targets.length} produit${targets.length > 1 ? "s" : ""} mis à jour`);
        clearSelection();
        setModal({ type: "none" });
      })
      .catch(() => {
        toast.error("Erreur", {
          description: "Une erreur est survenue lors de l'ajustement groupé.",
        });
      })
      .finally(() => {
        setIsBulkSubmitting(false);
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
      stockValue: item.stockValue,
      status: item.status,
    }));
    exportStockToExcel(exportItems).catch(() => {
      toast.error("Erreur", {
        description: "L'export Excel a échoué.",
      });
    });
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

        {/* ── Barre santé globale ────────────────────────────────────────────── */}
        {!isLoading && (
          <HealthBanner
            totalProducts={stockItems.length}
            totalValue={totalStockValue}
            normalCount={normalCount}
            lowCount={lowCount}
            criticalCount={criticalCount}
            visible={bannerVisible}
          />
        )}

        {/* ── KPI stat cards ─────────────────────────────────────────────────── */}
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

        {/* ── Valeur totale — inline pill ────────────────────────────────────── */}
        {!isLoading && totalStockValue > 0 && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm w-full sm:w-fit shadow-sm flex-wrap">
            <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Valeur totale du stock :</span>
            <span
              className="font-bold break-all"
              style={{ fontFamily: "'Fraunces', serif", color: COLOR.copper }}
            >
              {totalStockValue.toLocaleString("fr-FR")} FCFA
            </span>
          </div>
        )}

        {/* ── Level filter pills ─────────────────────────────────────────────── */}
        {!isLoading && (
          <div className="mb-4">
            <LevelFilterPills
              filter={levelFilter}
              onChange={(v) => { setLevelFilter(v); clearSelection(); setPage(1); }}
              total={stockItems.length}
              normalCount={normalCount}
              lowCount={lowCount}
              criticalCount={criticalCount}
            />
          </div>
        )}

        {/* ── Search + view toggle ───────────────────────────────────────────── */}
        <div
          className="bg-card border rounded-xl shadow-sm p-2.5 sm:p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3"
        >
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

        {/* ── Table toolbar (category filter + bulk actions + export) ───────── */}
        <TableToolbar
          showCheckbox={viewMode === "list"}
          isAllSelected={isAllSelected(allPageIds)}
          isIndeterminate={isIndeterminate(allPageIds)}
          onToggleAll={() => toggleAll(allPageIds)}
          selectedCount={selectedIds.size}
          bulkActions={
            viewMode === "list" && can("manage_stock") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkAdjustOpen}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                Ajuster la sélection
              </Button>
            ) : undefined
          }
          filterValue={categoryFilter}
          filterOptions={categoryOptions}
          filterPlaceholder="Toutes catégories"
          onFilterChange={(val) => {
            setCategoryFilter(val);
            clearSelection();
            setPage(1);
          }}
          showExport
          onExport={handleExport}
          exportLabel="Exporter Excel"
          ExportIcon={FileSpreadsheet}
        />

        {/* ── Error state ────────────────────────────────────────────────────── */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
            Impossible de charger les données de stock. Veuillez réessayer.
          </div>
        )}

        {/* ── Vue grille ─────────────────────────────────────────────────────── */}
        {viewMode === "grid" && isLoading && <GridSkeleton />}
        {viewMode === "grid" && !isLoading && (
          <div key={tableKey}>
            {typedPaginated.length === 0 && (
              <div className="rounded-xl border bg-card py-10 flex flex-col items-center gap-2 text-muted-foreground">
                <Package className="w-8 h-8 opacity-40" />
                <p className="text-sm">Aucun produit trouvé.</p>
              </div>
            )}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {typedPaginated.map((item, index) => {
                const pct =
                  item.max > 0
                    ? Math.min(100, Math.round((item.stock / item.max) * 100))
                    : 0;
                return (
                  <div
                    key={item.id}
                    className="group rounded-xl bg-card hover:shadow-md transition-all p-3 flex flex-col gap-2"
                    style={{
                      border:
                        item.status === "critique"
                          ? `1px solid hsl(0 72% 52% / 0.30)`
                          : item.status === "bas"
                          ? `1px solid hsl(36 88% 52% / 0.30)`
                          : "1px solid hsl(var(--border))",
                      borderLeft:
                        item.status === "critique"
                          ? `3px solid hsl(0 72% 52%)`
                          : item.status === "bas"
                          ? `3px solid hsl(36 88% 52%)`
                          : "3px solid transparent",
                      background:
                        item.status === "critique"
                          ? "hsl(0 72% 52% / 0.04)"
                          : "hsl(var(--card))",
                      animationDelay: `${index * 40}ms`,
                      animation: "slideInUp 0.3s ease forwards",
                      opacity: 0,
                    }}
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
                      className="text-2xl font-black tabular-nums"
                      style={{
                        fontFamily: "'Fraunces', serif",
                        color: statusColor(item.status),
                      }}
                    >
                      {item.stock}
                    </p>

                    {/* Barre de progression */}
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: COLOR.barBg }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: statusGrad(item.status),
                          transformOrigin: "left",
                          animation: `stockBarGrow 0.6s ease-out ${index * 40 + 200}ms both`,
                        }}
                      />
                    </div>

                    {/* Seuils + badge */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {item.min} – {item.max}
                      </span>
                      <StatusPill status={item.status} />
                    </div>

                    {/* Bouton Ajuster */}
                    {can("manage_stock") && (
                      <div className="mt-auto pt-1 border-t sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-9 text-xs"
                          style={{
                            borderColor: `${COLOR.copper}50`,
                            color: COLOR.copper,
                          }}
                          onClick={() => setModal({ type: "adjust", item })}
                        >
                          <ArrowUpDown className="w-3 h-3 mr-1" />
                          Ajuster
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── Vue liste — Desktop ────────────────────────────────────────────── */}
        {viewMode === "list" && (isLoading ? (
          <TableSkeleton />
        ) : (
          <div key={tableKey} className="hidden md:block bg-card rounded-xl border shadow-sm overflow-hidden">
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
                  {typedPaginated.map((item, index) => {
                    const pct = item.max > 0
                      ? Math.min(100, Math.round((item.stock / item.max) * 100))
                      : 0;
                    return (
                      <tr
                        key={item.id}
                        className="group"
                        style={{
                          background: isSelected(item.id)
                            ? "hsl(var(--primary) / 0.05)"
                            : item.status === "critique"
                            ? "hsl(0 72% 52% / 0.04)"
                            : item.status === "bas"
                            ? "hsl(36 88% 52% / 0.03)"
                            : "transparent",
                          borderLeft:
                            item.status === "critique"
                              ? `3px solid hsl(0 72% 52%)`
                              : item.status === "bas"
                              ? `3px solid hsl(36 88% 52%)`
                              : "3px solid transparent",
                          animationDelay: `${index * 40}ms`,
                          animation: "slideInUp 0.3s ease forwards",
                          opacity: 0,
                        }}
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

                        {/* Colonne Stock avec barre visuelle */}
                        <td className="px-4 py-3">
                          <StockBarCell item={item} rowIndex={index} />
                        </td>

                        <td className="tabular-nums text-muted-foreground">{item.min}</td>
                        <td className="tabular-nums text-muted-foreground">{item.max}</td>

                        {/* Colonne niveau — barre + % */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-16 sm:w-24 h-1.5 rounded-full overflow-hidden"
                              style={{ background: COLOR.barBg }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  background: statusGrad(item.status),
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </td>

                        {/* Statut pill */}
                        <td>
                          <StatusPill status={item.status} />
                        </td>

                        <td>
                          <div className="flex items-center justify-end gap-1.5 pr-2">
                            {can("manage_stock") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5"
                                style={{
                                  borderColor: `${COLOR.copper}50`,
                                  color: COLOR.copper,
                                }}
                                onClick={() => setModal({ type: "adjust", item })}
                              >
                                <ArrowUpDown className="w-3.5 h-3.5 lg:mr-1" />
                                <span className="hidden lg:inline">Ajuster</span>
                              </Button>
                            )}
                            {can("manage_stock") && (
                              <button
                                className="p-2 rounded-md hover:bg-secondary flex items-center gap-1 text-xs text-muted-foreground transition-colors"
                                title="Définir les seuils"
                                onClick={() => setModal({ type: "threshold", item })}
                              >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="hidden lg:inline">Seuils</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* ── Mobile : card list ─────────────────────────────────────────────── */}
        {viewMode === "list" && !isLoading && (
          <div key={tableKey + "-m"} className="md:hidden space-y-2">
            {typedPaginated.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucun produit trouvé.
              </div>
            )}
            {typedPaginated.map((item, index) => {
              const pct = item.max > 0
                ? Math.min(100, Math.round((item.stock / item.max) * 100))
                : 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    border:
                      item.status === "critique"
                        ? `1px solid hsl(0 72% 52% / 0.30)`
                        : item.status === "bas"
                        ? `1px solid hsl(36 88% 52% / 0.28)`
                        : "1px solid hsl(var(--border))",
                    borderLeft:
                      item.status === "critique"
                        ? `3px solid hsl(0 72% 52%)`
                        : item.status === "bas"
                        ? `3px solid hsl(36 88% 52%)`
                        : "3px solid transparent",
                    background: isSelected(item.id)
                      ? "hsl(var(--primary) / 0.04)"
                      : item.status === "critique"
                      ? "hsl(0 72% 52% / 0.04)"
                      : "hsl(var(--card))",
                    animationDelay: `${index * 40}ms`,
                    animation: "slideInUp 0.3s ease forwards",
                    opacity: 0,
                  }}
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
                    <StatusPill status={item.status} />
                  </div>

                  {/* Stock quantité + seuils */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center rounded-lg border px-2 py-0.5 text-sm font-bold tabular-nums"
                      style={{
                        background: statusBg(item.status),
                        color: statusTextColor(item.status),
                        borderColor: `${statusColor(item.status)}33`,
                        fontFamily: "'Fraunces', serif",
                      }}
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
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: COLOR.barBg }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: statusGrad(item.status),
                      }}
                    />
                  </div>

                  {/* Actions */}
                  {can("manage_stock") && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <button
                        className="px-3 min-h-[44px] rounded-md hover:bg-secondary transition-colors flex items-center gap-1.5 text-xs text-muted-foreground font-medium"
                        title="Définir les seuils"
                        onClick={() => setModal({ type: "threshold", item })}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Seuils</span>
                      </button>
                      <Button
                        size="sm"
                        className="h-11 rounded-md text-white"
                        style={{
                          background: `linear-gradient(135deg, ${COLOR.copper}, hsl(36 88% 52%))`,
                          boxShadow: `0 2px 8px ${COLOR.copper}44`,
                          border: "none",
                        }}
                        onClick={() => setModal({ type: "adjust", item })}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                        Ajuster
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────────────────── */}
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
          <DialogContent
            className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-0"
            style={{ borderRadius: "20px", overflow: "hidden" }}
          >
            <DialogHeader
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%), hsl(28 80% 56%))",
                padding: "16px 16px 14px",
              }}
            >
              <DialogTitle
                style={{
                  fontFamily: "var(--font-heading, inherit)",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              >
                Ajuster le stock — {modal.item.name}
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <AdjustStockForm
                item={modal.item}
                onSubmit={handleAdjust}
                onCancel={() => setModal({ type: "none" })}
                isSubmitting={adjustMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal : Ajuster la sélection (bulk) ──────────────────────────────── */}
      {modal.type === "adjustBulk" && (
        <Dialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <DialogContent
            className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-0"
            style={{ borderRadius: "20px", overflow: "hidden" }}
          >
            <DialogHeader
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%), hsl(28 80% 56%))",
                padding: "16px 16px 14px",
              }}
            >
              <DialogTitle
                style={{
                  fontFamily: "var(--font-heading, inherit)",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              >
                Ajuster la sélection — {modal.ids.size} produit{modal.ids.size > 1 ? "s" : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <AdjustStockForm
                item={{ id: -1, stockId: -1, name: "", category: "", imageUrl: null, stock: 0, min: 0, max: 0, price: 0, stockValue: 0, status: "normal" }}
                onSubmit={handleBulkAdjust}
                onCancel={() => setModal({ type: "none" })}
                isSubmitting={isBulkSubmitting}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal : Définir les seuils ───────────────────────────────────────── */}
      {modal.type === "threshold" && (
        <Dialog
          open
          onOpenChange={(open) => !open && setModal({ type: "none" })}
        >
          <DialogContent
            className="w-[calc(100vw-2rem)] sm:max-w-sm max-h-[90vh] overflow-y-auto p-0"
            style={{ borderRadius: "20px", overflow: "hidden" }}
          >
            <DialogHeader
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%), hsl(28 80% 56%))",
                padding: "16px 16px 14px",
              }}
            >
              <DialogTitle
                style={{
                  fontFamily: "var(--font-heading, inherit)",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
              >
                Définir les seuils — {modal.item.name}
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <ThresholdForm
              item={modal.item}
              onSubmit={handleThreshold}
              onCancel={() => setModal({ type: "none" })}
              isSubmitting={thresholdMutation.isPending}
            />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
