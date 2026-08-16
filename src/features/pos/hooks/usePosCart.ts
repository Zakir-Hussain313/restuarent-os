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

  // Delegates to the store's own getDiscountAmount() instead of
  // reimplementing coupon math here a second time — this hook just
  // needs the result, and duplicating the scoping/percentage logic
  // in two places is how they'd silently drift apart later. Selected
  // reactively (not via getState()) so it's a real, honest dependency
  // for the useMemo below rather than an imperative read hidden inside it.
  const discountAmount = usePosStore((s) => s.getDiscountAmount());

  return useMemo((): CartTotals => {
    const subtotal = cartItems.reduce((acc, item) => acc + item.itemTotal, 0);
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
  }, [cartItems, discountAmount]);
}