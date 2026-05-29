"use client";

import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import type { CustomerType } from "@/types";

const CUSTOMER_TYPES: { value: CustomerType; label: string; icon: string }[] = [
  { value: "dine_in", label: "Dine In", icon: "🍽️" },
  { value: "takeaway", label: "Takeaway", icon: "🥡" },
  { value: "delivery", label: "Delivery", icon: "🛵" },
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
            <span>{ct.icon}</span>
            <span>{ct.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}