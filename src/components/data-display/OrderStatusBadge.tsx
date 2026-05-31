import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  confirmed: "bg-blue-500/10 text-blue-700 border-blue-200",
  cancelled:  "bg-red-500/10 text-red-700 border-red-200",
};

const STATUS_DOTS: Record<OrderStatus, string> = {
  confirmed: "bg-blue-500",
  cancelled:  "bg-red-500",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "Confirmed",
  cancelled:  "Cancelled",
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