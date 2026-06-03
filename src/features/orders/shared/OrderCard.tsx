"use client";

import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/features/orders/components/OrderDetail/OrderStatusBadge";
import { cn } from "@/lib/utils";
import { formatOrderAge, formatOrderType } from "./orderFormatters";
import type { Order } from "@/types/order";

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}

export function OrderCard({ order, isSelected, onClick }: OrderCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 border-b last:border-0 transition-colors",
        "hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/50",
        isSelected && "bg-muted/70 border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-foreground leading-none">
          #{order.orderNumber}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs px-2 py-0 h-5 font-normal">
          {formatOrderType(order.orderType)}
        </Badge>
        {order.tableNumber && (
          <span className="text-xs text-muted-foreground">
            Table {order.tableNumber}
          </span>
        )}
        {order.deliveryAddress && (
          <span className="text-xs text-muted-foreground truncate max-w-30">
            {order.deliveryAddress}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {order.customerName ?? "Guest"} · {order.items.length}{" "}
          {order.items.length === 1 ? "item" : "items"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatOrderAge(order.createdAt)}
          </span>
          <span className="text-xs font-semibold text-foreground">
            Rs. {order.total.toLocaleString()}
          </span>
        </div>
      </div>
    </button>
  );
}