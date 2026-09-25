"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Package, Trash2, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IngredientDialog } from "./ingredient-dialog";
import { deleteIngredientAction } from "@/features/inventory/actions";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { cn, formatNumberWithCommas } from "@/lib/utils";
import type { IngredientWithStatus } from "@/features/inventory/actions";

interface IngredientsTableProps {
  ingredients: IngredientWithStatus[];
}

type StatusFilter = "all" | "ok" | "low" | "inactive";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "OK", value: "ok" },
  { label: "Low Stock", value: "low" },
  { label: "Inactive", value: "inactive" },
];

export function IngredientsTable({ ingredients }: IngredientsTableProps) {
  const { showConfirm, showAlert } = useAlertModal();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function handleDelete(ingredient: IngredientWithStatus) {
    const confirmed = await showConfirm(
      `This permanently deletes "${ingredient.name}". Only possible because it has no stock history yet.`,
      { title: "Delete ingredient?", confirmLabel: "Delete", destructive: true }
    );
    if (!confirmed) return;

    setDeletingId(ingredient.id);
    const result = await deleteIngredientAction(ingredient.id);
    setDeletingId(null);
    if (result.error) {
      showAlert(result.error, "Couldn't delete ingredient");
      return;
    }
    router.refresh();
  }

  if (ingredients.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No ingredients yet. Add your first ingredient to get started.
        </p>
      </div>
    );
  }

  const isFiltered = search.trim() !== "" || statusFilter !== "all";

  const filtered = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "inactive" && !ing.isActive) ||
      (statusFilter === "low" && ing.isActive && ing.isLowStock) ||
      (statusFilter === "ok" && ing.isActive && !ing.isLowStock);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="hidden sm:block h-5 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                statusFilter === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No ingredients match your filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Low-Stock Threshold</TableHead>
                <TableHead>Avg Cost / Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ing) => (
                <TableRow key={ing.id}>
                  <TableCell>
                    <div className="h-9 w-9 rounded-lg overflow-hidden bg-secondary border border-border flex items-center justify-center shrink-0">
                      {ing.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ing.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell>{ing.unit}</TableCell>
                  <TableCell>
                    {ing.currentStock} {ing.unit}
                  </TableCell>
                  <TableCell>
                    {ing.lowStockThreshold !== null
                      ? `${ing.lowStockThreshold} ${ing.unit}`
                      : "—"}
                  </TableCell>
                  <TableCell>PKR {formatNumberWithCommas(ing.avgCostPerUnit)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {!ing.isActive && (
                        <Badge variant="secondary">inactive</Badge>
                      )}
                      {ing.isActive && ing.isLowStock && (
                        <Badge variant="destructive">low stock</Badge>
                      )}
                      {ing.isActive && !ing.isLowStock && (
                        <Badge variant="chip-green">ok</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <IngredientDialog ingredient={ing} branchId={ing.branchId} />
                      <button
                        type="button"
                        disabled={deletingId === ing.id}
                        onClick={() => handleDelete(ing)}
                        title="Delete"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === ing.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
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