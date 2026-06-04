"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useOrderDetail } from "../../hooks/useOrderDetail";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderActions } from "./OrderActions";
import {
  Clock,
  MapPin,
  User,
  UtensilsCrossed,
  Hash,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetailProps {
  orderId: string;
}

function getRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export function OrderDetail({ orderId }: OrderDetailProps) {
  const {
    order,
    isLoading,
    canPrintKitchenTicket,
    canPrintBill,
    canCancel,
    printKitchenTicket,
    isPrintingKitchenTicket,
    completeBill,
    isCompletingBill,
    cancelOrder,
    isCancelling,
  } = useOrderDetail(orderId);

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <UtensilsCrossed className="w-10 h-10 opacity-30" />
        <p className="text-sm">Order not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-base font-semibold leading-tight flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {order.orderNumber}
            </span>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {getRelativeTime(order.createdAt)}
          </span>

          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {ORDER_TYPE_LABEL[order.orderType]}
          </span>

          {order.tableNumber && (
            <span className="flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Table {order.tableNumber}
            </span>
          )}

          {order.deliveryAddress && (
            <span className="flex items-center gap-1.5 max-w-50 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {order.deliveryAddress}
            </span>
          )}

          {order.customerPhone && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {order.customerPhone}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Items
          </p>

          <div className="space-y-1">
            {order.items.map((item) => {
              const isCancelled = item.status === "cancelled";
              return (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-3 py-2 transition-opacity ${isCancelled ? "opacity-40" : ""
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium leading-tight ${isCancelled ? "line-through" : ""
                          }`}
                      >
                        {item.menuItemName}
                      </span>

                      {item.selectedVariant && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          {item.selectedVariant.variantName}
                        </span>
                      )}

                      {isCancelled && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">
                          Removed
                        </span>
                      )}
                    </div>

                    {item.selectedModifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.selectedModifiers
                          .map((m) => m.optionName)
                          .join(", ")}
                      </p>
                    )}

                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      Rs. {item.itemTotal.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × Rs.{" "}
                      {item.unitPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="mx-5 my-2" />

        {/* Financials */}
        <div className="px-5 py-3 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>Rs. {order.subtotal.toLocaleString()}</span>
          </div>

          {order.totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>
                Discount
                {order.discounts.length === 1
                  ? ` — ${order.discounts[0].name}`
                  : ""}
              </span>
              <span>− Rs. {order.totalDiscount.toLocaleString()}</span>
            </div>
          )}

          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Delivery Fee</span>
              <span>Rs. {order.deliveryFee.toLocaleString()}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>Rs. {order.total.toLocaleString()}</span>
          </div>

          <div className={cn(
            "flex justify-between text-sm font-medium px-3 py-2 rounded-lg border",
            order.paymentStatus === "paid"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              : "bg-red-300 border-red-800 text-red-800"
          )}>
            <span>
              {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
            </span>
            <span>
              {order.paymentStatus === "paid"
                ? `Rs. ${order.totalPaid.toLocaleString()}`
                : `Rs. ${order.total.toLocaleString()} due`}
            </span>
          </div>
        </div>

        {order.notes && (
          <>
            <Separator className="mx-5" />
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Notes
              </p>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          </>
        )}

        <div className="h-4" />
      </ScrollArea>

      {/* Actions */}
      <div className="px-5 py-4 border-t shrink-0">
        <OrderActions
          order={order}
          canPrintKitchenTicket={canPrintKitchenTicket}
          canPrintBill={canPrintBill}
          canCancel={canCancel}
          onPrintKitchenTicket={printKitchenTicket}
          isPrintingKitchenTicket={isPrintingKitchenTicket}
          onCompleteBill={completeBill}
          isCompletingBill={isCompletingBill}
          onCancelOrder={cancelOrder}
          isCancelling={isCancelling}
        />
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="px-5 py-4 border-b space-y-3 shrink-0">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-5 w-32 bg-muted rounded" />
          </div>
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between items-start">
            <div className="space-y-1.5">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t space-y-2 shrink-0">
        <div className="h-9 w-full bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 bg-muted rounded" />
          <div className="h-9 flex-1 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}