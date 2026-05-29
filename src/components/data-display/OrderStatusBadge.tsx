import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-200",
  preparing: "bg-orange-500/10 text-orange-700 border-orange-200",
  ready: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  served: "bg-teal-500/10 text-teal-700 border-teal-200",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-red-500/10 text-red-700 border-red-200",
  refunded: "bg-purple-500/10 text-purple-700 border-purple-200",
};

const STATUS_DOTS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500 animate-pulse",
  ready: "bg-emerald-500",
  served: "bg-teal-500",
  completed: "bg-muted-foreground",
  cancelled: "bg-red-500",
  refunded: "bg-purple-500",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOTS[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}