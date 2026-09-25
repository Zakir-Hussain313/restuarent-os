"use client";

import { useState } from "react";
import { ChefHat, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  getIngredientsAction,
  getRecipeAction,
  setRecipeAction,
} from "@/features/inventory/actions";
import type { IngredientWithStatus } from "@/features/inventory/actions";
import type { MenuItem } from "@/types";
import { formatNumberWithCommas } from "@/lib/utils";

interface RecipeDialogProps {
  item: MenuItem;
}

const ALL_VARIANTS = "__all__";

interface EditLine {
  key: string; // stable key for React list rendering only
  ingredientId: string;
  menuItemVariantId: string; // ALL_VARIANTS or a real variant id
  quantityPerUnit: string;
}

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `line-${keyCounter}`;
}

// Bulk-purchased ingredients are stored in kg/l, but a single recipe line
// is usually a small fraction of that (150g, not 0.15kg) — staff type the
// everyday amount here and it's converted to the stored base unit.
function displayUnitInfo(baseUnit: string): { label: string; factor: number } {
  if (baseUnit === "kg") return { label: "g", factor: 1000 };
  if (baseUnit === "l") return { label: "ml", factor: 1000 };
  return { label: baseUnit, factor: 1 };
}

// Shape returned by getRecipeAction — kept as loaded for the read-only view
// and as the source of truth to revert to if edits are cancelled.
interface RecipeLineData {
  id: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  avgCostPerUnit: number;
  menuItemVariantId: string | null;
  variantName: string | null;
  quantityPerUnit: number;
  lineCost: number;
}

function buildEditLines(data: RecipeLineData[], ingredientsList: IngredientWithStatus[]): EditLine[] {
  return data.map((l) => {
    const baseUnit = ingredientsList.find((i) => i.id === l.ingredientId)?.unit ?? "";
    const { factor } = displayUnitInfo(baseUnit);
    const displayValue = Math.round(l.quantityPerUnit * factor * 1000) / 1000;
    return {
      key: newKey(),
      ingredientId: l.ingredientId,
      menuItemVariantId: l.menuItemVariantId ?? ALL_VARIANTS,
      quantityPerUnit: String(displayValue),
    };
  });
}

export function RecipeDialog({ item }: RecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<IngredientWithStatus[]>([]);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [recipeData, setRecipeData] = useState<RecipeLineData[]>([]);
  // "view" (read-only table) is only ever the starting mode when a recipe
  // already exists — an item with nothing linked yet goes straight to edit.
  const [mode, setMode] = useState<"view" | "edit">("edit");

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const [ingredientsResult, recipeResult] = await Promise.all([
      getIngredientsAction(item.branchId),
      getRecipeAction(item.id),
    ]);

    if (ingredientsResult.error) {
      setError(ingredientsResult.error);
      setIsLoading(false);
      return;
    }
    if (recipeResult.error) {
      setError(recipeResult.error);
      setIsLoading(false);
      return;
    }

    const loadedIngredients = ingredientsResult.data ?? [];
    const loadedRecipe = recipeResult.data ?? [];
    setIngredients(loadedIngredients);
    setRecipeData(loadedRecipe);
    setLines(buildEditLines(loadedRecipe, loadedIngredients));
    setMode(loadedRecipe.length > 0 ? "view" : "edit");
    setIsLoading(false);
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: newKey(), ingredientId: "", menuItemVariantId: ALL_VARIANTS, quantityPerUnit: "" },
    ]);
  }

  function updateLine(key: string, patch: Partial<EditLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function cancelEdit() {
    // A saved recipe exists — discard in-progress edits and go back to the
    // read view instead of closing the whole dialog.
    if (recipeData.length > 0) {
      setLines(buildEditLines(recipeData, ingredients));
      setError(null);
      setMode("view");
      return;
    }
    setOpen(false);
  }

  async function handleSubmit() {
    for (const l of lines) {
      if (!l.ingredientId) {
        setError("Every line needs an ingredient.");
        return;
      }
      if (!l.quantityPerUnit || Number(l.quantityPerUnit) <= 0) {
        setError("Every line needs a quantity greater than 0.");
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    const result = await setRecipeAction(
      item.id,
      lines.map((l) => {
        const { factor } = displayUnitInfo(ingredientUnit(l.ingredientId));
        return {
          ingredientId: l.ingredientId,
          menuItemVariantId: l.menuItemVariantId === ALL_VARIANTS ? null : l.menuItemVariantId,
          quantityPerUnit: Number(l.quantityPerUnit) / factor,
        };
      })
    );

    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
  }

  function ingredientLabel(id: string) {
    return ingredients.find((i) => i.id === id)?.name ?? "Select ingredient...";
  }

  function ingredientUnit(id: string) {
    return ingredients.find((i) => i.id === id)?.unit ?? "";
  }

  function variantLabel(variantId: string) {
    if (variantId === ALL_VARIANTS) return "All variants";
    return item.variants.find((v) => v.id === variantId)?.name ?? "All variants";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) loadData();
      }}
    >
      <DialogTrigger
        render={
          <button
            className="w-6 h-6 rounded-lg bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            title="Edit recipe"
          >
            <ChefHat className="w-3.5 h-3.5" />
          </button>
        }
      />
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Recipe — {item.name}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden themed-scrollbar rounded-b-2xl px-5 pt-2 pb-2 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
          ) : mode === "view" ? (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Applies To</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeData.map((row) => {
                    const { label, factor } = displayUnitInfo(row.unit);
                    const displayQty = Math.round(row.quantityPerUnit * factor * 1000) / 1000;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.ingredientName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.variantName ?? "All variants"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {displayQty} {label}
                        </TableCell>
                        <TableCell className="text-sm">PKR {formatNumberWithCommas(row.lineCost)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <>
              {lines.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No ingredients linked yet. This item won&apos;t deduct any stock when sold.
                </p>
              )}

              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.key} className="rounded-lg border border-border p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs">Ingredient</Label>
                        <Select
                          value={line.ingredientId}
                          onValueChange={(v) =>
                            // Clearing quantity on ingredient change avoids a
                            // stale number silently meaning something
                            // different if the new ingredient's unit differs.
                            v && updateLine(line.key, { ingredientId: v, quantityPerUnit: "" })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select ingredient...">
                              {() => ingredientLabel(line.ingredientId)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} ({i.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 mt-5"
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {item.variants.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Applies To</Label>
                        <Select
                          value={line.menuItemVariantId}
                          onValueChange={(v) => v && updateLine(line.key, { menuItemVariantId: v })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>{() => variantLabel(line.menuItemVariantId)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_VARIANTS}>All variants</SelectItem>
                            {item.variants.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Quantity Per Unit Sold{" "}
                        {line.ingredientId ? `(${displayUnitInfo(ingredientUnit(line.ingredientId)).label})` : ""}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        value={line.quantityPerUnit}
                        onChange={(e) => updateLine(line.key, { quantityPerUnit: e.target.value })}
                        placeholder={
                          line.ingredientId && displayUnitInfo(ingredientUnit(line.ingredientId)).factor > 1
                            ? "e.g. 150"
                            : "e.g. 0.25"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={addLine} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Ingredient
              </Button>
            </>
          )}
        </div>

        <DialogFooter className="mx-5 mb-5">
          {mode === "view" ? (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={() => setMode("edit")}>
                <Pencil className="w-4 h-4 mr-1" /> Edit Recipe
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading || isSaving}>
                {isSaving ? "Saving..." : "Save Recipe"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}