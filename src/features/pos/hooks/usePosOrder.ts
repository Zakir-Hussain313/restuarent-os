"use client";

import { useCallback, useRef, useState } from "react";
import { usePosStore } from "@/store/usePosStore";
import { createOrderAction, confirmOrderAction, getOrderByIdAction, type CreateOrderInput } from "@/features/orders/actions";
import { printKitchenTicket } from "@/features/orders/lib/printKitchenTicket";
import { enqueuePendingOrder } from "@/lib/offlineOrderQueue";
import { decrementStaffToken, getBranchCouponSnapshot, getOrCreateStaffLedger } from "@/lib/couponTokenStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getOfflineRef, printOfflineTicketAndBill } from "@/features/orders/lib/printKitchenTicket";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

interface UsePosOrderReturn {
  placeOrder: () => void;
  holdOrder: () => void;
  isSubmitting: boolean;
  lastOrderId: string | null;
  error: string | null;
}

class TimeoutError extends Error { }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError("Request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function usePosOrder(autoConfirmOnPlace?: boolean): UsePosOrderReturn {
  const { showAlert } = useAlertModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cartItems = usePosStore((s) => s.cartItems);
  const orderType = usePosStore((s) => s.orderType);
  const tableId = usePosStore((s) => s.tableId);
  const customerPhone = usePosStore((s) => s.customerPhone);
  const deliveryAddress = usePosStore((s) => s.deliveryAddress);
  const notes = usePosStore((s) => s.notes);
  const appliedCoupon = usePosStore((s) => s.appliedCoupon);
  const selectedRiderId = usePosStore((s) => s.selectedRiderId);
  const tableNumber = usePosStore((s) => s.tableNumber);
  const clearCart = usePosStore((s) => s.clearCart);
  const currentStaff = useAuthStore((s) => s.currentStaff);

  const idempotencyRef = useRef<{ key: string; cartSignature: string } | null>(null);
  const isSubmittingRef = useRef(false);

  const getIdempotencyKey = useCallback((cartSignature: string): string => {
    if (idempotencyRef.current && idempotencyRef.current.cartSignature === cartSignature) {
      // Same cart as the last attempt — this is a retry, reuse the same key
      // so a duplicate landing late on the server gets recognized and dropped.
      return idempotencyRef.current.key;
    }
    const key = crypto.randomUUID();
    idempotencyRef.current = { key, cartSignature };
    return key;
  }, []);

  const buildInput = useCallback((): CreateOrderInput => {
    return {
      orderType,
      tableId,
      customerPhone,
      deliveryAddress,
      couponId: appliedCoupon?.id,
      notes,
      items: cartItems.map((ci) => ({
        menuItemId: ci.menuItem.id,
        variantId: ci.selectedVariant?.variantId,
        modifierOptionIds: ci.selectedModifiers.map((m) => m.optionId),
        quantity: ci.quantity,
        notes: ci.notes,
      })),
    };
  }, [cartItems, orderType, tableId, customerPhone, deliveryAddress, notes, appliedCoupon]);

  const placeOrder = useCallback(async () => {
    if (cartItems.length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (orderType === "delivery" && (!customerPhone?.trim() || !deliveryAddress?.trim())) {
      showAlert("Customer phone and delivery address are required for delivery orders.");
      isSubmittingRef.current = false;
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const input = buildInput();
    const idempotencyKey = getIdempotencyKey(JSON.stringify(input));

    try {
      const result = await withTimeout(
        createOrderAction(input, undefined, selectedRiderId, idempotencyKey),
        15000
      );

      if (!result.success) {
        setError(result.error);
        showAlert(`Failed to place order: ${result.error}`);
        return;
      }

      setLastOrderId(result.order.id);

      if (autoConfirmOnPlace) {
        const confirmResult = await confirmOrderAction(result.order.id);
        if (confirmResult.success) {
          // Re-fetch the order — confirmOrderAction may have auto-assigned a
          // rider, and the kitchen ticket should reflect the confirmed state.
          const freshOrder = await getOrderByIdAction(result.order.id);
          if (freshOrder.data) {
            printKitchenTicket(freshOrder.data);
          } else {
            // Fall back to the just-created order if the re-fetch fails —
            // the ticket just won't show rider info, which is a minor gap,
            // not a reason to block the whole flow.
            printKitchenTicket(result.order);
          }
        } else {
          // Order was created successfully but auto-confirm failed — don't
          // silently hide this, staff needs to know to confirm manually.
          showAlert(`Order placed, but auto-confirm failed: ${confirmResult.error}. Please confirm it manually from Orders.`);
        }
      }

      idempotencyRef.current = null;
      clearCart();
    } catch (err) {
      console.error("[usePosOrder] placeOrder failed, queueing locally:", err);

      try {
        const queuedAt = new Date();
        await enqueuePendingOrder({
          idempotencyKey,
          input,
          riderId: selectedRiderId,
          createdAt: queuedAt.getTime(),
          attempts: 0,
          lastError: err instanceof Error ? err.message : String(err),
          autoConfirmOnPlace,
          staffId: currentStaff?.id ?? "",
          branchId: currentStaff?.branchId ?? "",
        });

        if (appliedCoupon && currentStaff?.id && currentStaff?.branchId) {
          try {
            // Ensure the ledger exists before decrementing — covers the
            // rare case where the offline event never fired but the order
            // still failed (e.g. DNS/timeout instead of a clean drop).
            // Both calls are local IndexedDB reads, no network involved.
            const snapshot = await getBranchCouponSnapshot(currentStaff.branchId);
            if (snapshot) {
              await getOrCreateStaffLedger(currentStaff.id, snapshot);
            }
            await decrementStaffToken(currentStaff.id, currentStaff.branchId, appliedCoupon.id);
          } catch (tokenErr) {
            // Never let a ledger failure block the already-saved offline
            // order — worst case the local count drifts slightly until
            // reconciliation, not a lost order.
            console.error("[usePosOrder] Failed to decrement coupon token:", tokenErr);
          }
        }

        // Print the physical kitchen ticket now, at the moment of actual
        // placement — not later when sync happens. Only fires under the
        // same auto-print setting as the live path; the real order number
        // gets attached once this syncs, but the offline ref printed here
        // (derived from the idempotency key) stays matched to it forever.
        if (autoConfirmOnPlace) {
          const offlineRef = getOfflineRef(idempotencyKey);
          const totals = usePosStore.getState().getTotals();

          // One combined print job (ticket + bill as two pages) instead of
          // two separate print() calls — see printOfflineTicketAndBill for
          // why sequencing two automated dialogs doesn't work reliably.
          await printOfflineTicketAndBill(
            {
              cartItems,
              orderType,
              tableNumber,
              notes,
              offlineRef,
              queuedAt,
            },
            {
              cartItems,
              orderType,
              tableNumber,
              offlineRef,
              queuedAt,
              subtotal: totals.subtotal,
              discountAmount: totals.discountAmount,
              deliveryFee: totals.deliveryFee,
              total: totals.total,
            }
          );
        }

        const message =
          "No connection — this order has been saved on this device and will be sent automatically once you're back online.";
        setError(message);
        showAlert(message);

        // The order is now safely captured locally — treat this like a
        // successful submission from the staff member's point of view.
        // They should move on to the next customer, not sit staring at
        // a failed cart. idempotencyRef resets so their NEXT order gets
        // a fresh key, not this one.
        idempotencyRef.current = null;
        clearCart();
      } catch (queueErr) {
        // Only reachable if IndexedDB itself is unavailable/full — a real
        // failure, not just "offline". This is the one case that must
        // still alarm the staff member loudly, since nothing was saved
        // anywhere.
        console.error("[usePosOrder] Failed to queue order locally:", queueErr);
        const message = "Could not reach the server AND could not save this order locally. Please write this order down manually.";
        setError(message);
        showAlert(message);
      }
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [cartItems, buildInput, clearCart, orderType, customerPhone, deliveryAddress, selectedRiderId, autoConfirmOnPlace, getIdempotencyKey, tableNumber, notes, currentStaff, appliedCoupon , showAlert]);

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