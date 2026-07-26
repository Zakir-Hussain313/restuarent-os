"use client";

import { useCallback, useState } from "react";
import { usePosStore } from "@/store/usePosStore";
import { createOrderAction, type CreateOrderInput } from "@/features/orders/actions";

interface UsePosOrderReturn {
  placeOrder: () => void;
  holdOrder: () => void;
  isSubmitting: boolean;
  lastOrderId: string | null;
  error: string | null;
}

export function usePosOrder(): UsePosOrderReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cartItems = usePosStore((s) => s.cartItems);
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const notes = usePosStore((s) => s.notes);
  const discountValue = usePosStore((s) => s.discountValue);
  const discountType = usePosStore((s) => s.discountType);
  const clearCart = usePosStore((s) => s.clearCart);

  const buildInput = useCallback((): CreateOrderInput => {
    return {
      orderType,
      tableId,
      customerPhone,
      discountType,
      discountValue,
      notes,
      items: cartItems.map((ci) => ({
        menuItemId: ci.menuItem.id,
        variantId: ci.selectedVariant?.variantId,
        modifierOptionIds: ci.selectedModifiers.map((m) => m.optionId),
        quantity: ci.quantity,
        notes: ci.notes,
      })),
    };
  }, [cartItems, orderType, tableId, customerPhone, notes, discountValue, discountType]);

  const placeOrder = useCallback(async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const input = buildInput();
    const result = await createOrderAction(input);

    if (result.success) {
      setLastOrderId(result.order.id);
      clearCart();
    } else {
      setError(result.error);
      alert(`Failed to place order: ${result.error}`);
    }

    setIsSubmitting(false);
  }, [cartItems.length, isSubmitting, buildInput, clearCart]);

  const holdOrder = useCallback(() => {
    clearCart();
  }, [clearCart]);

  return {
    placeOrder,
    holdOrder,
    isSubmitting,
    lastOrderId,
    error,
  };
}