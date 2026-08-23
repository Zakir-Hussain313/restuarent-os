"use client";

import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import type { CustomerType } from "@/types";
import { UtensilsCrossed, ShoppingBag, Bike } from "lucide-react";
import { LucideIcon } from "lucide-react";

const CUSTOMER_TYPES: { value: CustomerType; label: string; icon: LucideIcon }[] = [

  { value: "dine_in", label: "Dine In", icon: UtensilsCrossed },
  { value: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { value: "delivery", label: "Delivery", icon: Bike },
];

export function CustomerTypeSelector() {
  const orderType = usePosStore((s) => s.orderType);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Customer Type
      </label>
      <div className="flex gap-1.5">
        {CUSTOMER_TYPES.map((ct) => (
          <div
            key={ct.value}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
              orderType === ct.value
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-transparent"
            )}
          >
            <ct.icon className="w-3.5 h-3.5" />
            <span>{ct.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}