"use client";

import { useMemo } from "react";
import { usePosStore } from "@/store/usePosStore";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TAX_RATE = 0.17;     // 17% GST Pakistan
export const SERVICE_RATE = 0.05; // 5% service charge

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  serviceCharge: number;
  tax: number;
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
    // Subtotal: sum of itemTotal (already unitPrice × qty)
    const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);

    // Discount calculation
    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === "percentage") {
        discountAmount = subtotal * (Math.min(discountValue, 100) / 100);
      } else {
        discountAmount = Math.min(discountValue, subtotal);
      }
    }

    const discountedSubtotal = subtotal - discountAmount;
    const serviceCharge = discountedSubtotal * SERVICE_RATE;
    const tax = discountedSubtotal * TAX_RATE;
    const grandTotal = discountedSubtotal + serviceCharge + tax;

    const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const uniqueItemCount = cartItems.length;

    return {
      subtotal,
      discountAmount,
      serviceCharge,
      tax,
      grandTotal: Math.max(0, grandTotal),
      itemCount,
      uniqueItemCount,
    };
  }, [cartItems, discountValue, discountType]);
}