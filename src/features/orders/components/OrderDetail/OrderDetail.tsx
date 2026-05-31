"use client";

import { Loader2, XCircle, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { useOrderDetail } from "../../hooks/useOrderDetail";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderItemsTable } from "./OrderItemsTable";
import { OrderFinancials } from "./OrderFinancials";

interface OrderDetailProps {
  orderId: string | null;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in:  "🍽️ Dine In",
  takeaway: "🥡 Takeaway",
  delivery: "🛵 Delivery",
  walk_in:  "🚶 Walk-in",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function OrderDetail({ orderId }: OrderDetailProps) {
  const { order, isLoading, canCancel, cancelOrder, isCancelling } =
    useOrderDetail(orderId);

  if (!orderId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <ClipboardList className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Select an order to view details</p>
        <p className="text-xs text-muted-foreground mt-1">Click any order from the list</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{order.orderNumber}</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span>
              {order.tableNumber && (
                <>
                  <span>·</span>
                  <span>Table {order.tableNumber}</span>
                </>
              )}
            </div>
            {order.deliveryAddress && (
              <p className="text-xs text-muted-foreground mt-1">
                📍 {order.deliveryAddress}
              </p>
            )}
          </div>

          {/* Total + Cancel */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <p className="text-xl font-bold tabular-nums">{formatCurrency(order.total)}</p>
            <p className="text-xs text-muted-foreground">
              {order.items.reduce((s, i) => s + i.quantity, 0)} items
            </p>
            {canCancel && (
              <button
                onClick={cancelOrder}
                disabled={isCancelling}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  "border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                )}
              >
                {isCancelling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-6">

        <Section title="Order Items">
          <OrderItemsTable items={order.items} />
        </Section>

        <Section title="Financials">
          <OrderFinancials order={order} />
        </Section>

        {(order.customerPhone || order.notes) && (
          <Section title="Details">
            <div className="space-y-1.5 text-sm">
              {order.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="italic">{order.notes}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}