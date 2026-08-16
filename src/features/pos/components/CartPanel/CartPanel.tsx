"use client";

import { usePosStore } from "@/store/usePosStore";
import { OrderTypeSelector } from "./OrderTypeSelector";
import { CartItemList } from "./CartItemList";
import { CouponPicker } from "./CouponPicker";
import { OrderSummary } from "./OrderSummary";
import { CartActions } from "./CartActions";
import { DeliveryDetailsForm } from "./DeliveryDetailsForm";

interface CartPanelProps {
  branchId?: string;
  autoConfirmOnPlace?: boolean;
}

export function CartPanel({ branchId, autoConfirmOnPlace }: CartPanelProps) {
  const orderType = usePosStore((s) => s.orderType);

  return (
    <div className="flex flex-col h-full bg-background border-l overflow-hidden">

      {/* Header — fixed */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b">
        <h2 className="text-base font-semibold mb-3">Current Order</h2>
        <OrderTypeSelector />
      </div>

      {/* Scrollable middle — items + table selector */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4">
        <CartItemList />

        {/* Table selector lives at the bottom of the scroll area */}
        {orderType === "delivery" && (
          <div className="pt-2 pb-4 border-t border-border mt-2">
            <DeliveryDetailsForm branchId={branchId} />
          </div>
        )}
      </div>

      {/* Footer — always pinned */}
      <div className="shrink-0 px-4 pb-4 pt-3 border-t space-y-3 bg-background">
        <CouponPicker />
        <OrderSummary />
        <CartActions autoConfirmOnPlace={autoConfirmOnPlace} />
      </div>
    </div>
  );
}