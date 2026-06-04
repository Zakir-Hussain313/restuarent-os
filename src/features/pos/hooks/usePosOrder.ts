"use client";

import { useCallback, useState } from "react";
import { usePosStore } from "@/store/usePosStore";
import { useOrderStore } from "@/store/useOrderStore";
import { usePosCart } from "./usePosCart";
import { generateId } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import type { Order, OrderItem, OrderStatus } from "@/types";

interface PlaceOrderResult {
  success: boolean;
  orderId: string;
}

interface UsePosOrderReturn {
  placeOrder: () => void;
  holdOrder: () => void;
  isSubmitting: boolean;
  lastOrderId: string | null;
}

async function simulatePlaceOrder(order: Order): Promise<PlaceOrderResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { success: true, orderId: order.id };
  // When backend is ready: replace with real API call
  // const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify(order) });
  // return res.json();
}

export function usePosOrder(): UsePosOrderReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const cartItems = usePosStore((s) => s.cartItems);
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const tableNumber = usePosStore((s) => s.tableNumber);
  const customerId = usePosStore((s) => s.customerId);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const notes = usePosStore((s) => s.notes);
  const discountValue = usePosStore((s) => s.discountValue);
  const discountType = usePosStore((s) => s.discountType);
  const clearCart = usePosStore((s) => s.clearCart);

  const addOrder = useOrderStore((s) => s.addOrder);

  const totals = usePosCart();

  const buildOrder = useCallback((): Order => {
    const now = new Date().toISOString();
    const orderId = generateId("ord");

    const items: OrderItem[] = cartItems.map((ci) => ({
      id: generateId("oi"),
      orderId,
      menuItemId: ci.menuItem.id,
      menuItemName: ci.menuItem.name,
      menuItemImage: ci.menuItem.image,
      categoryId: ci.menuItem.categoryId,
      categoryName: "",
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      selectedVariant: ci.selectedVariant,
      selectedModifiers: ci.selectedModifiers,
      itemTotal: ci.itemTotal,
      notes: ci.notes,
      status: "pending",
      createdAt: now,
    }));

    const discounts =
      discountValue > 0 && discountType
        ? [
            {
              id: generateId("disc"),
              name:
                discountType === "percentage"
                  ? `${discountValue}% Discount`
                  : "Flat Discount",
              type: discountType,
              value: discountValue,
              appliedAmount: totals.discountAmount,
              appliedBy: "pos_staff",
            },
          ]
        : [];

    return {
      id: orderId,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      restaurantId: "rest_001",
      branchId: "branch_001",
      tableId,
      tableNumber,
      customerId,
      customerPhone,
      orderType,
      status: "pending" as OrderStatus,
      items,
      subtotal: totals.subtotal,
      discounts,
      totalDiscount: totals.discountAmount,
      deliveryFee:
        orderType === "delivery" ? RESTAURANT_CONFIG.defaultDeliveryFee : 0,
      total: totals.grandTotal,
      paymentStatus: "unpaid",
      payments: [],
      totalPaid: 0,
      balance: totals.grandTotal,
      notes,
      staffId: "staff_001",
      createdAt: now,
      updatedAt: now,
    };
  }, [cartItems, orderType, tableId, tableNumber, customerId, customerPhone, notes, discountValue, discountType, totals]);

  const placeOrder = useCallback(async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    const order = buildOrder();

    try {
      const result = await simulatePlaceOrder(order);
      if (result.success) {
        addOrder(order);        // write to Zustand store → persisted to localStorage
        setLastOrderId(result.orderId);
        clearCart();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [cartItems.length, isSubmitting, buildOrder, addOrder, clearCart]);

  const holdOrder = useCallback(() => {
    clearCart();
  }, [clearCart]);

  return {
    placeOrder,
    holdOrder,
    isSubmitting,
    lastOrderId,
  };
}