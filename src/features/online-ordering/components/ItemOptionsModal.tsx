"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { useItemOptions } from "@/features/menu/hooks/useItemOptions";
import type { MenuItem } from "@/types";

type ItemSelection = ReturnType<ReturnType<typeof useItemOptions>["buildSelection"]>;

interface ItemOptionsModalProps {
  item: MenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (unitPrice: number, selection: ItemSelection) => void;
}

export function ItemOptionsModal({ item, open, onOpenChange, onConfirm }: ItemOptionsModalProps) {
  const {
    selectedVariantId,
    setSelectedVariantId,
    selectedOptionIds,
    toggleOption,
    unitPrice,
    canConfirm,
    missingRequiredGroupIds,
    buildSelection,
  } = useItemOptions(item);

  const availableVariants = item.variants.filter((v) => v.isAvailable);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(unitPrice, buildSelection());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a1815]">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto -mx-1 px-1">
          {availableVariants.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide">Choose size</p>
              <div className="rounded-xl border border-[#ebe9e4] bg-white p-2 space-y-0.5">
                {availableVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
                      selectedVariantId === variant.id
                        ? "bg-[#e8570e]/10 text-[#e8570e] font-medium"
                        : "hover:bg-[#e8570e]/5 text-[#1a1815]"
                    )}
                  >
                    <span>{variant.name}</span>
                    <span className="tabular-nums">{formatCurrency(variant.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {item.modifierGroups.map((group) => {
            const selectedIds = selectedOptionIds[group.id] ?? [];
            const isMissing = missingRequiredGroupIds.includes(group.id);
            return (
              <div key={group.id} className="space-y-1.5">
                <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide flex items-center gap-1.5">
                  {group.name}
                  {group.isRequired && (
                    <span className={cn("text-[10px] normal-case", isMissing ? "text-red-500" : "text-[#8a8680]/70")}>
                      · required
                    </span>
                  )}
                </p>
                <div className="rounded-xl border border-[#ebe9e4] bg-white p-2 space-y-0.5">
                  {group.options
                    .filter((o) => o.isAvailable)
                    .map((option) => {
                      const isSelected = selectedIds.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOption(group.id, option.id, group.maxSelections)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors",
                            isSelected
                              ? "bg-[#e8570e]/10 text-[#e8570e] font-medium"
                              : "hover:bg-[#e8570e]/5 text-[#1a1815]"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
                                isSelected ? "bg-[#e8570e] border-[#e8570e]" : "border-[#ebe9e4]"
                              )}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-sm bg-white" />}
                            </span>
                            {option.name}
                          </span>
                          {option.priceAdjustment !== 0 && (
                            <span className="tabular-nums text-xs">
                              {option.priceAdjustment > 0 ? "+" : ""}
                              {formatCurrency(option.priceAdjustment)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-1.5 bg-[#e8570e] hover:bg-[#c44a0c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Add to Cart · {formatCurrency(unitPrice)}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}