"use client";

import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface OrderFinancialsProps {
  order: Order;
}

function Row({
  label,
  value,
  muted = false,
  bold = false,
  highlight = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between py-1", highlight && "border-t border-border mt-1 pt-2")}>
      <span className={cn("text-sm", muted ? "text-muted-foreground" : "text-foreground", bold && "font-bold text-2xl")}>
        {label}
      </span>
      <span className={cn("text-sm tabular-nums", bold ? "font-semibold" : "font-medium", highlight && "text-primary text-2xl font-bold")}>
        {value}
      </span>
    </div>
  );
}

export function OrderFinancials({ order }: OrderFinancialsProps) {
  return (
    <div>
      <Row label="Subtotal" value={formatCurrency(order.subtotal)} muted />

      {order.discounts.map((d) => (
        <Row
          key={d.id}
          label={`${d.name} (${d.type === "percentage" ? `${d.value}%` : formatCurrency(d.value)})`}
          value={`− ${formatCurrency(d.appliedAmount)}`}
          muted
        />
      ))}

      {order.deliveryFee > 0 && (
        <Row label="Delivery Fee" value={formatCurrency(order.deliveryFee)} muted />
      )}

      <Row label="Total" value={formatCurrency(order.total)} bold highlight />
    </div>
  );
}