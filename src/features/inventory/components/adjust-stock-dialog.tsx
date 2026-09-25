"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
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
import { adjustStockAction } from "@/features/inventory/actions";
import type { IngredientWithStatus } from "@/features/inventory/actions";

interface AdjustStockDialogProps {
  ingredients: IngredientWithStatus[];
}

type Kind = "wastage" | "count" | "other";

const KIND_LABELS: Record<Kind, string> = {
  wastage: "Wastage",
  count: "Physical Count",
  other: "Other",
};

export function AdjustStockDialog({ ingredients }: AdjustStockDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<Kind>("wastage");
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState(""); // wastage
  const [countedStock, setCountedStock] = useState(""); // count
  const [quantityChange, setQuantityChange] = useState(""); // other
  const [notes, setNotes] = useState("");

  function resetForm() {
    setKind("wastage");
    setIngredientId("");
    setQuantity("");
    setCountedStock("");
    setQuantityChange("");
    setNotes("");
    setError(null);
  }

  const selectedIngredient = ingredients.find((i) => i.id === ingredientId);

  const canSubmit =
    !!ingredientId &&
    (kind === "wastage"
      ? !!quantity
      : kind === "count"
      ? !!countedStock
      : !!quantityChange && !!notes.trim());

  async function handleSubmit() {
    if (!ingredientId) {
      setError("Select an ingredient.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await adjustStockAction(
      kind === "wastage"
        ? { kind, ingredientId, quantity: Number(quantity), notes: notes.trim() || undefined }
        : kind === "count"
        ? { kind, ingredientId, countedStock: Number(countedStock), notes: notes.trim() || undefined }
        : { kind, ingredientId, quantityChange: Number(quantityChange), notes: notes.trim() }
    );

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <ClipboardList className="w-4 h-4 mr-1" /> Adjust Stock
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Adjustment Type</Label>
            <Select value={kind} onValueChange={(v) => v && setKind(v as Kind)}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => KIND_LABELS[kind]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Ingredient</Label>
            <Select value={ingredientId} onValueChange={(v) => v && setIngredientId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ingredient...">
                  {() => selectedIngredient?.name ?? "Select ingredient..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.unit}) — {i.currentStock} on hand
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {kind === "wastage" && (
            <div className="space-y-1.5">
              <Label>Quantity Wasted {selectedIngredient ? `(${selectedIngredient.unit})` : ""}</Label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>
          )}

          {kind === "count" && (
            <div className="space-y-1.5">
              <Label>
                Counted Stock {selectedIngredient ? `(${selectedIngredient.unit})` : ""}
                {selectedIngredient ? ` — system shows ${selectedIngredient.currentStock}` : ""}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={countedStock}
                onChange={(e) => setCountedStock(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          )}

          {kind === "other" && (
            <div className="space-y-1.5">
              <Label>Quantity Change {selectedIngredient ? `(${selectedIngredient.unit}, +/-)` : ""}</Label>
              <Input
                type="number"
                step="0.001"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                placeholder="e.g. -1.5 or 3"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes{kind === "other" ? " (required)" : " (optional)"}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for this adjustment" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !canSubmit}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}