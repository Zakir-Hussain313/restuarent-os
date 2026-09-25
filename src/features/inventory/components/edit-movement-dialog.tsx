"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import { editMostRecentStockMovementAction } from "@/features/inventory/actions";
import { formatNumberWithCommas } from "@/lib/utils";
import type { StockMovement } from "@/db/schema";

interface EditMovementDialogProps {
  movement: StockMovement;
  ingredientName: string;
  unit: string;
}

export function EditMovementDialog({ movement, ingredientName, unit }: EditMovementDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPurchase = movement.reason === "purchase";
  const isWastage = movement.reason === "wastage";
  // correction / other share one signed field.

  const [quantity, setQuantity] = useState(
    isPurchase ? String(movement.quantityChange) : String(Math.abs(movement.quantityChange))
  );
  const [totalCost, setTotalCost] = useState(String(movement.costImpact));
  const [quantityChange, setQuantityChange] = useState(String(movement.quantityChange));

  function resetForm() {
    setQuantity(isPurchase ? String(movement.quantityChange) : String(Math.abs(movement.quantityChange)));
    setTotalCost(String(movement.costImpact));
    setQuantityChange(String(movement.quantityChange));
    setError(null);
  }

  const canSubmit = isPurchase
    ? !!quantity && !!totalCost
    : isWastage
    ? !!quantity
    : !!quantityChange && Number(quantityChange) !== 0;

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);

    const result = await editMostRecentStockMovementAction(
      movement.id,
      isPurchase
        ? { quantity: Number(quantity), totalCost: Math.round(Number(totalCost)) }
        : isWastage
        ? { quantity: Number(quantity) }
        : { quantityChange: Number(quantityChange) }
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
          <button
            type="button"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Edit entry"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {movement.reason} — {ingredientName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Only this ingredient&apos;s most recent entry can be edited. Reason, ingredient, and supplier can&apos;t be changed here.
          </p>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {(isPurchase || isWastage) && (
            <div className="space-y-1.5">
              <Label>{isPurchase ? "Quantity Received" : "Quantity Wasted"} ({unit})</Label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          )}

          {isPurchase && (
            <div className="space-y-1.5">
              <Label>Total Cost Paid (PKR)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={totalCost ? formatNumberWithCommas(Number(totalCost)) : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "");
                  if (raw === "" || /^\d+$/.test(raw)) setTotalCost(raw);
                }}
              />
            </div>
          )}

          {!isPurchase && !isWastage && (
            <div className="space-y-1.5">
              <Label>Quantity Change ({unit}, +/-)</Label>
              <Input
                type="number"
                step="0.001"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
              />
            </div>
          )}
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