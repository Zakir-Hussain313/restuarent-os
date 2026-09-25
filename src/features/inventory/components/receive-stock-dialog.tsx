"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus } from "lucide-react";
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
import { receiveStockAction } from "@/features/inventory/actions";
import type { IngredientWithStatus } from "@/features/inventory/actions";
import type { Supplier } from "@/db/schema";
import { formatNumberWithCommas } from "@/lib/utils";

interface ReceiveStockDialogProps {
  ingredients: IngredientWithStatus[];
  suppliers: Supplier[];
}

export function ReceiveStockDialog({ ingredients, suppliers }: ReceiveStockDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ingredientId, setIngredientId] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setIngredientId("");
    setSupplierId("");
    setQuantity("");
    setTotalCost("");
    setNotes("");
    setError(null);
  }

  const selectedIngredient = ingredients.find((i) => i.id === ingredientId);

  async function handleSubmit() {
    if (!ingredientId) {
      setError("Select an ingredient.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await receiveStockAction({
      ingredientId,
      quantity: Number(quantity),
      totalCost: Math.round(Number(totalCost)),
      supplierId: supplierId || null,
      notes: notes.trim() || undefined,
    });

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
      <DialogTrigger render={<Button size="sm"><PackagePlus className="w-4 h-4 mr-1" /> Receive Stock</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

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
                    {i.name} ({i.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Supplier (optional)</Label>
            <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No supplier">
                  {() => suppliers.find((s) => s.id === supplierId)?.name ?? "No supplier"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Quantity {selectedIngredient ? `(${selectedIngredient.unit})` : ""}</Label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Total Cost Paid (PKR, whole delivery)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={totalCost ? formatNumberWithCommas(Number(totalCost)) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d+$/.test(raw)) setTotalCost(raw);
              }}
              placeholder="e.g. 5,000"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !ingredientId || !quantity || !totalCost}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}