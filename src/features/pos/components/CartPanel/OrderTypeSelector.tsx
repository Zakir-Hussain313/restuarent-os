"use client";

import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import type { OrderType } from "@/types";
import { UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { LucideIcon } from "lucide-react";

const ORDER_TYPES: { value: OrderType; label: string; icon: LucideIcon }[] = [
  { value: "dine_in", label: "Dine In", icon: UtensilsCrossed },
  { value: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { value: "delivery", label: "Delivery", icon: Bike },
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
            "flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 min-[760px]:py-2 px-1.5 sm:px-3 rounded-md min-[760px]:text-sm font-medium transition-all",
            orderType === ot.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ot.icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{ot.label}</span>
        </button>
      ))}
    </div>
  );
}