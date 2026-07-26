import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-200",
  out_for_delivery: "bg-purple-500/10 text-purple-700 border-purple-200",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-500/10 text-red-700 border-red-200",
};

const STATUS_DOTS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  out_for_delivery: "bg-purple-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
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