"use client";

import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import type { OrderType } from "@/types";

const ORDER_TYPES: { value: OrderType; label: string; icon: string }[] = [
  { value: "dine_in", label: "Dine In", icon: "🍽️" },
  { value: "takeaway", label: "Takeaway", icon: "🥡" },
  { value: "delivery", label: "Delivery", icon: "🛵" },
];

export function OrderTypeSelector() {
  const orderType = usePosStore((s) => s.orderType);
  const setOrderType = usePosStore((s) => s.setOrderType);
  const clearTable = usePosStore((s) => s.clearTable);

  function handleSelect(type: OrderType) {
    setOrderType(type);
    if (type !== "dine_in") clearTable();
  }

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {ORDER_TYPES.map((ot) => (
        <button
          key={ot.value}
          onClick={() => handleSelect(ot.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
            orderType === ot.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{ot.icon}</span>
          <span>{ot.label}</span>
        </button>
      ))}
    </div>
  );
}