"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { cn, formatNumberWithCommas } from "@/lib/utils";
import type { StockMovement } from "@/db/schema";
import { EditMovementDialog } from "./edit-movement-dialog";

type MovementRow = {
  movement: StockMovement;
  ingredientName: string;
  unit: string;
  supplierName: string | null;
};

interface StockHistoryTablesProps {
  movements: MovementRow[];
}

type DatePreset = "all" | "today" | "this_week" | "this_month";

interface DateRange {
  from: Date | null;
  to: Date | null;
}

const REASON_BADGE: Record<StockMovement["reason"], "chip-green" | "destructive" | "chip-blue" | "secondary"> = {
  purchase: "chip-green",
  sale: "chip-blue",
  wastage: "destructive",
  correction: "secondary",
  other: "secondary",
};

const REASON_OPTIONS: { label: string; value: StockMovement["reason"] }[] = [
  { label: "Purchase", value: "purchase" },
  { label: "Sale", value: "sale" },
  { label: "Wastage", value: "wastage" },
  { label: "Correction", value: "correction" },
  { label: "Other", value: "other" },
];

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeDateBounds(preset: DatePreset, range: DateRange): { from: Date | null; to: Date | null } {
  const now = new Date();

  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: null };
  }

  if (preset === "this_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { from: start, to: null };
  }

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start, to: null };
  }

  if (range.from || range.to) {
    let to: Date | null = null;
    if (range.to) {
      to = new Date(range.to);
      to.setHours(23, 59, 59, 999);
    }
    return { from: range.from, to };
  }

  return { from: null, to: null };
}

function inDateBounds(date: Date | string, bounds: { from: Date | null; to: Date | null }): boolean {
  const d = new Date(date);
  if (bounds.from && d < bounds.from) return false;
  if (bounds.to && d > bounds.to) return false;
  return true;
}

export function StockHistoryTables({ movements }: StockHistoryTablesProps) {
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<StockMovement["reason"] | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const supplierOptions = useMemo(() => {
    const names = new Set(movements.map((m) => m.supplierName).filter((n): n is string => !!n));
    return Array.from(names).sort();
  }, [movements]);

  // Only an ingredient's single most-recent movement is ever editable, and
  // only if it carries a before-snapshot (created after migration 0035).
  // Computed off the full unfiltered list — editability is a ledger fact,
  // not something that should change as filters are applied.
  const mostRecentIdByIngredient = useMemo(() => {
    const map = new Map<string, { id: string; createdAt: string | Date }>();
    for (const { movement } of movements) {
      const current = map.get(movement.ingredientId);
      if (!current || new Date(movement.createdAt) > new Date(current.createdAt)) {
        map.set(movement.ingredientId, { id: movement.id, createdAt: movement.createdAt });
      }
    }
    return map;
  }, [movements]);

  function isEditable(movement: StockMovement): boolean {
    return (
      movement.reason !== "sale" &&
      movement.avgCostBeforeMovement !== null &&
      movement.stockBeforeMovement !== null &&
      mostRecentIdByIngredient.get(movement.ingredientId)?.id === movement.id
    );
  }

  const dateBounds = computeDateBounds(datePreset, dateRange);
  const isFiltered =
    search.trim() !== "" ||
    reasonFilter !== "all" ||
    supplierFilter !== "all" ||
    datePreset !== "all" ||
    dateRange.from !== null ||
    dateRange.to !== null;

  const filtered = movements.filter(({ movement, ingredientName, supplierName }) => {
    const matchesSearch = ingredientName.toLowerCase().includes(search.trim().toLowerCase());
    const matchesReason = reasonFilter === "all" || movement.reason === reasonFilter;
    const matchesSupplier = supplierFilter === "all" || supplierName === supplierFilter;
    const matchesDate = inDateBounds(movement.createdAt, dateBounds);
    return matchesSearch && matchesReason && matchesSupplier && matchesDate;
  });

  function clearFilters() {
    setSearch("");
    setReasonFilter("all");
    setSupplierFilter("all");
    setDatePreset("all");
    setDateRange({ from: null, to: null });
  }

  if (movements.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">No stock movements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ingredient..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <Select value={supplierFilter} onValueChange={(v) => setSupplierFilter(v ?? "all")}>
            <SelectTrigger className="h-8 w-auto text-xs">
              <SelectValue placeholder="All Suppliers">
                {() => (supplierFilter === "all" ? "All Suppliers" : supplierFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {supplierOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="h-px bg-border" />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setReasonFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                reasonFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              All Reasons
            </button>
            {REASON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReasonFilter(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                  reasonFilter === option.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block h-5 w-px bg-border" />

          <div className="flex flex-wrap items-center gap-1.5">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setDatePreset(preset.value);
                  setDateRange({ from: null, to: null });
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                  datePreset === preset.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <DatePicker
              value={dateRange.from}
              max={dateRange.to ?? new Date()}
              onChange={(date) => {
                setDatePreset("all");
                setDateRange((prev) => ({ ...prev, from: date }));
              }}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <DatePicker
              value={dateRange.to}
              min={dateRange.from}
              max={new Date()}
              onChange={(date) => {
                setDatePreset("all");
                setDateRange((prev) => ({ ...prev, to: date }));
              }}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No movements match your filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Qty Change</TableHead>
                <TableHead>Cost Impact</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ movement, ingredientName, unit, supplierName }) => (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(movement.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{ingredientName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{supplierName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={REASON_BADGE[movement.reason]}>{movement.reason}</Badge>
                  </TableCell>
                  <TableCell className={movement.quantityChange < 0 ? "text-destructive" : "text-emerald-600"}>
                    {movement.quantityChange > 0 ? "+" : ""}
                    {movement.quantityChange} {unit}
                  </TableCell>
                  <TableCell className={movement.costImpact < 0 ? "text-destructive" : "text-emerald-600"}>
                    {movement.costImpact > 0 ? "+" : ""}
                    PKR {formatNumberWithCommas(movement.costImpact)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{movement.createdByName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{movement.notes ?? "—"}</TableCell>
                  <TableCell>
                    {isEditable(movement) && (
                      <EditMovementDialog movement={movement} ingredientName={ingredientName} unit={unit} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}