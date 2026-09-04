"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

type ChipVariant = "chip-coral" | "chip-blue" | "chip-violet" | "chip-green" | "destructive";

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: ChipVariant }> = {
  pending: { label: "Pending", variant: "chip-coral" },
  confirmed: { label: "Confirmed", variant: "chip-blue" },
  ready_for_delivery: { label: "Ready for Delivery", variant: "chip-coral" },
  out_for_delivery: { label: "Out for Delivery", variant: "chip-violet" },
  delivered: { label: "Delivered", variant: "chip-green" },
  completed: { label: "Completed", variant: "chip-green" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function OrderStatusBadge({ status, size = "md" }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(size === "sm" && "h-auto text-[10px] px-1.5 py-0.5")}
    >
      {config.label}
    </Badge>
  );
}