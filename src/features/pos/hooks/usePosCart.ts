"use client";

import { useMemo } from "react";
import { usePosStore } from "@/store/usePosStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  itemCount: number;
  uniqueItemCount: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePosCart(): CartTotals {
  const cartItems = usePosStore((s) => s.cartItems);
  const discountValue = usePosStore((s) => s.discountValue);
  const discountType = usePosStore((s) => s.discountType);

  return useMemo((): CartTotals => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);

    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === "percentage") {
        discountAmount = subtotal * (Math.min(discountValue, 100) / 100);
      } else {
        discountAmount = Math.min(discountValue, subtotal);
      }
    }

    const grandTotal = subtotal - discountAmount;

    const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const uniqueItemCount = cartItems.length;

    return {
      subtotal,
      discountAmount,
      grandTotal: Math.max(0, grandTotal),
      itemCount,
      uniqueItemCount,
    };
  }, [cartItems, discountValue, discountType]);
}