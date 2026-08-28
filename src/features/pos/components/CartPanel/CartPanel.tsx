"use client";
import { usePosStore } from "@/store/usePosStore";
import { OrderTypeSelector } from "./OrderTypeSelector";
import { CartItemList } from "./CartItemList";
import { CouponPicker } from "./CouponPicker";
import { OrderSummary } from "./OrderSummary";
import { CartActions } from "./CartActions";
import { DeliveryDetailsForm } from "./DeliveryDetailsForm";
import { TableSelector } from "./TableSelector";
import { ClockButton } from "../ClockButton";
interface CartPanelProps {
  branchId?: string;
  autoConfirmOnPlace?: boolean;
  showClockButton?: boolean;
  initialIsClockedIn?: boolean;
}
export function CartPanel({ branchId, autoConfirmOnPlace, showClockButton, initialIsClockedIn }: CartPanelProps) {
  const orderType = usePosStore((s) => s.orderType);
  return (
    <div className="flex flex-col h-full bg-background border-l overflow-hidden">
      {/* Header â€” fixed */}
      <div className="shrink-0 px-4 pt-5 pb-4 min-[760px]:pt-4 min-[760px]:pb-3 border-b">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold">Current Order</h2>
          {showClockButton && <ClockButton initialIsClockedIn={initialIsClockedIn ?? false} />}
        </div>
        <OrderTypeSelector />
      </div>
      {/* Scrollable middle — items + table selector */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 flex flex-col">
        <CartItemList />

        {orderType === "delivery" && (
          <div className="pt-2 pb-4 border-t border-border mt-2">
            <DeliveryDetailsForm branchId={branchId} />
          </div>
        )}

                {orderType === "dine_in" && (
          <div className="pt-2 pb-4 border-t border-border mt-2">
            <TableSelector branchId={branchId} />
          </div>
        )}
      </div>

      {/* Footer — always pinned */}
      <div className="shrink-0 px-4 pb-6 pt-4 min-[760px]:pb-4 min-[760px]:pt-3 border-t space-y-3 bg-background">
        <CouponPicker branchId={branchId} />
        <OrderSummary />
        <CartActions autoConfirmOnPlace={autoConfirmOnPlace} />
      </div>
    </div>
  );
}