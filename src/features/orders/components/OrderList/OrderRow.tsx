"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types";

interface OrderRowProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}

const ORDER_TYPE_CONFIG = {
  dine_in:  { icon: "🍽️", label: "Dine In" },
  takeaway: { icon: "🥡", label: "Takeaway" },
  delivery: { icon: "🛵", label: "Delivery" },
  walk_in:  { icon: "🚶", label: "Walk-in" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OrderRow({ order, isSelected, onClick }: OrderRowProps) {
  const typeConfig = ORDER_TYPE_CONFIG[order.orderType] ?? { icon: "🧾", label: order.orderType };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 border-b border-border transition-colors",
        isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/50 border-l-2 border-l-transparent"
      )}
    >
      {/* Top row: order number + time */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold tabular-nums">{order.orderNumber}</span>
        <span className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</span>
      </div>

      {/* Middle row: type icon + table or label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs">{typeConfig.icon}</span>
        <span className="text-xs text-muted-foreground">
          {order.tableNumber ? `Table ${order.tableNumber}` : typeConfig.label}
        </span>
      </div>

      {/* Bottom row: total */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{typeConfig.label}</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(order.total)}
        </span>
      </div>
    </button>
  );
}