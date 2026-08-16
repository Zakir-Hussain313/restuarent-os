"use client";

import { usePosStore } from "@/store/usePosStore";
import { RiderSelector } from "./RiderSelector";

interface DeliveryDetailsFormProps {
  branchId?: string;
}

export function DeliveryDetailsForm({ branchId }: DeliveryDetailsFormProps) {
  const orderType = usePosStore((s) => s.orderType);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const deliveryAddress = usePosStore((s) => s.deliveryAddress);
  const setCustomerPhone = usePosStore((s) => s.setCustomerPhone);
  const setDeliveryAddress = usePosStore((s) => s.setDeliveryAddress);

  if (orderType !== "delivery") return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Customer Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          placeholder="03XX-XXXXXXX"
          value={customerPhone ?? ""}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Delivery Address <span className="text-red-500">*</span>
        </label>
        <textarea
          placeholder="House #, street, area, city..."
          value={deliveryAddress ?? ""}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          rows={2}
          className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>
      {branchId && <RiderSelector branchId={branchId} />}
    </div>
  );
}