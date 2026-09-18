"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatOrderType } from "@/features/orders/shared/orderFormatters";
import { completePendingOrderLocally, type PendingOrder } from "@/lib/offlineOrderQueue";
import { printOfflineBill } from "@/features/orders/lib/printKitchenTicket";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import type { PendingSyncOrder } from "@/features/orders/hooks/usePendingSyncOrders";

interface PendingSyncOrderCardProps {
  order: PendingSyncOrder;
  onChanged: () => void;
}

export function PendingSyncOrderCard({ order, onChanged }: PendingSyncOrderCardProps) {
  const { showConfirm } = useAlertModal();
  const [isBusy, setIsBusy] = useState(false);
  const { displaySnapshot } = order;

  async function handleCompleteAndPay() {
    const confirmed = await showConfirm(
      `Record a cash payment of Rs. ${displaySnapshot.totals.total.toLocaleString()} and complete this order? A bill will print.`,
      { title: "Complete order?" }
    );
    if (!confirmed) return;

    setIsBusy(true);
    try {
      await completePendingOrderLocally(order.idempotencyKey, displaySnapshot.totals.total);
      await printOfflineBill({
        cartItems: displaySnapshot.cartItems,
        orderType: displaySnapshot.orderType,
        tableNumber: displaySnapshot.tableNumber,
        offlineRef: order.offlineRef,
        queuedAt: new Date(order.createdAt),
        subtotal: displaySnapshot.totals.subtotal,
        discountAmount: displaySnapshot.totals.discountAmount,
        deliveryFee: displaySnapshot.totals.deliveryFee,
        total: displaySnapshot.totals.total,
      });
      onChanged();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReprintBill() {
    await printOfflineBill({
      cartItems: displaySnapshot.cartItems,
      orderType: displaySnapshot.orderType,
      tableNumber: displaySnapshot.tableNumber,
      offlineRef: order.offlineRef,
      queuedAt: new Date(order.createdAt),
      subtotal: displaySnapshot.totals.subtotal,
      discountAmount: displaySnapshot.totals.discountAmount,
      deliveryFee: displaySnapshot.totals.deliveryFee,
      total: displaySnapshot.totals.total,
    });
  }

  return (
    <div className="px-4 py-3.5 border-b last:border-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold leading-none text-foreground">{order.offlineRef}</span>
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-2 py-0 h-5 font-normal",
            order.localStatus === "completed"
              ? "border-emerald-500/40 text-emerald-600"
              : "border-coral/40 text-coral"
          )}
        >
          {order.localStatus === "completed" ? "Paid (cash) — pending sync" : "Pending sync"}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs px-2 py-0 h-5 font-normal">
          {formatOrderType(displaySnapshot.orderType)}
        </Badge>
        {displaySnapshot.tableNumber && (
          <span className="text-xs text-muted-foreground">Table {displaySnapshot.tableNumber}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {displaySnapshot.cartItems.length} {displaySnapshot.cartItems.length === 1 ? "item" : "items"}
        </span>
        <span className="text-xs font-semibold text-foreground">
          Rs. {displaySnapshot.totals.total.toLocaleString()}
        </span>
      </div>

      <div className="mt-2.5">
        {order.localStatus === "pending" ? (
          <button
            onClick={handleCompleteAndPay}
            disabled={isBusy}
            className="w-full text-xs font-medium rounded-md bg-primary text-primary-foreground py-1.5 disabled:opacity-50"
          >
            {isBusy ? "Completing..." : "Complete & record cash payment"}
          </button>
        ) : (
          <button
            onClick={handleReprintBill}
            className="w-full text-xs font-medium rounded-md border border-input py-1.5 hover:bg-muted"
          >
            Reprint bill
          </button>
        )}
      </div>
    </div>
  );
}