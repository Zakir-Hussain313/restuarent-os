"use client";

import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import type { CartItem as CartItemType } from "@/store/usePosStore";
import { formatCurrency } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const removeItem = usePosStore((s) => s.removeItem);

  return (
    <div className="flex items-start gap-2 py-3 border-b border-border last:border-0">
      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-tight">{item.menuItem.name}</p>
          {/* Always-visible remove button */}
          <button
            onClick={() => removeItem(item.cartItemId)}
            className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors mt-0.5"
            aria-label="Remove item"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {item.selectedVariant && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.selectedVariant.variantName}</p>
        )}
        {item.selectedModifiers.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {item.selectedModifiers.map((m) => m.optionName).join(", ")}
          </p>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground italic">&quot;{item.notes}&quot;</p>
        )}

        {/* Qty controls + line total */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
              className={cn(
                "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                "hover:border-muted-foreground hover:text-foreground"
              )}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
              className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-sm font-semibold">
            {formatCurrency(item.itemTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}