"use client";

import { formatCurrency } from "@/lib/utils";
import type { OrderItem } from "@/types";

interface OrderItemsTableProps {
  items: OrderItem[];
}

const ITEM_STATUS_COLOR: Record<OrderItem["status"], string> = {
  pending:   "text-yellow-600",
  cancelled: "text-red-500",
};

export function OrderItemsTable({ items }: OrderItemsTableProps) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-2 border-b border-border last:border-0"
        >
          {/* Qty badge */}
          <div className="shrink-0 w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-bold tabular-nums">
            {item.quantity}
          </div>

          {/* Item details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{item.menuItemName}</p>
            {item.selectedVariant && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.selectedVariant.variantName}
              </p>
            )}
            {item.selectedModifiers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                + {item.selectedModifiers.map((m) => m.optionName).join(", ")}
              </p>
            )}
            {item.notes && (
              <p className="text-xs text-muted-foreground italic">&quot;{item.notes}&quot;</p>
            )}
            <p className={`text-[10px] font-medium mt-0.5 capitalize ${ITEM_STATUS_COLOR[item.status]}`}>
              {item.status}
            </p>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(item.itemTotal)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              @ {formatCurrency(item.unitPrice)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}