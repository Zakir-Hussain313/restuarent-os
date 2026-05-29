"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePosStore } from "@/store/usePosStore";
import { usePosCart } from "./usePosCart";
import { queryKeys } from "@/hooks/useMockQuery";
import { generateId } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import type { Order, OrderItem, OrderStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Simulated order creation ─────────────────────────────────────────────────

async function simulatePlaceOrder(order: Order): Promise<PlaceOrderResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { success: true, orderId: order.id };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePosOrder(): UsePosOrderReturn {
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const cartItems = usePosStore((s) => s.cartItems);
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const tableNumber = usePosStore((s) => s.tableNumber);
  const customerId = usePosStore((s) => s.customerId);
  const customerName = usePosStore((s) => s.customerName);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const notes = usePosStore((s) => s.notes);
  const discountValue = usePosStore((s) => s.discountValue);
  const discountType = usePosStore((s) => s.discountType);
  const clearCart = usePosStore((s) => s.clearCart);

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
      categoryName: "", // denormalized — fill from category lookup if needed
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      selectedVariant: ci.selectedVariant,
      selectedModifiers: ci.selectedModifiers,
      itemTotal: ci.itemTotal,
      notes: ci.notes,
      status: "pending",
      createdAt: now,
    }));

    const discounts = discountValue > 0 && discountType
      ? [{
          id: generateId("disc"),
          name: discountType === "percentage" ? `${discountValue}% Discount` : "Flat Discount",
          type: discountType,
          value: discountValue,
          appliedAmount: totals.discountAmount,
          appliedBy: "pos_staff",
        }]
      : [];

    return {
      id: orderId,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      restaurantId: "rest_001",
      branchId: "branch_001",
      tableId,
      tableNumber,
      customerId,
      customerName,
      customerPhone,
      orderType,
      status: "pending" as OrderStatus,
      items,
      subtotal: totals.subtotal,
      discounts,
      totalDiscount: totals.discountAmount,
      taxRate: RESTAURANT_CONFIG.taxRate,
      taxAmount: totals.tax,
      serviceChargeRate: RESTAURANT_CONFIG.serviceChargeRate,
      serviceChargeAmount: totals.serviceCharge,
      deliveryFee: orderType === "delivery" ? RESTAURANT_CONFIG.defaultDeliveryFee : 0,
      total: totals.grandTotal,
      paymentStatus: "unpaid",
      payments: [],
      totalPaid: 0,
      balance: totals.grandTotal,
      notes,
      staffId: "staff_001", // replace with auth user id when backend exists
      createdAt: now,
      updatedAt: now,
    };
  }, [cartItems, orderType, tableId, tableNumber, customerId, customerName, customerPhone, notes, discountValue, discountType, totals]);

  const { mutate: submitOrder, isPending: isSubmitting } = useMutation({
    mutationFn: simulatePlaceOrder,
    onSuccess: (result) => {
      setLastOrderId(result.orderId);
      clearCart();
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });

  const placeOrder = useCallback(() => {
    if (cartItems.length === 0) return;
    submitOrder(buildOrder());
  }, [cartItems.length, buildOrder, submitOrder]);

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