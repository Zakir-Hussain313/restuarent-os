"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  getOrderByIdAction,
  confirmOrderAction,
  completeBillAction,
  cancelOrderAction,
} from "@/features/orders/actions";
import { markOrderReadyAction } from "@/features/deliveries/actions";
import type { Order, PaymentMethod } from "@/types";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { enqueuePendingPayment } from "@/lib/offlinePaymentQueue";
import { useAuthStore } from "@/store/useAuthStore";
import { withTimeout } from "@/lib/withTimeout";

interface UseOrderDetailReturn {
  order: Order | undefined;
  isLoading: boolean;
  canPrintKitchenTicket: boolean;
  canMarkReady: boolean;
  canPrintBill: boolean;
  canCompleteBill: boolean;
  canCancel: boolean;
  printKitchenTicket: () => void;
  isPrintingKitchenTicket: boolean;
  markReady: (riderId: string | "auto") => void;
  isMarkingReady: boolean;
  completeBill: (paymentMethod?: PaymentMethod) => void;
  isCompletingBill: boolean;
  cancelOrder: () => void;
  isCancelling: boolean;
}

export function useOrderDetail(orderId: string | null): UseOrderDetailReturn {
  const { showAlert } = useAlertModal();
  const queryClient = useQueryClient();
  const currentStaff = useAuthStore((s) => s.currentStaff);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ""),
    queryFn: async () => {
      const result = await getOrderByIdAction(orderId as string);
      if (!result.data) throw new Error(result.error);
      return result.data;
    },
    enabled: !!orderId,
  });

  const order = data;

  // After any status-changing action succeeds: refetch this order's detail
  // and the orders list (so ActiveOrders/Delivery/History pick up the change).
  function invalidateOrderQueries(id: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  }

  const { mutate: mutateKitchenTicket, isPending: isPrintingKitchenTicket } =
    useMutation({
      mutationFn: async (id: string) => {
        const result = await confirmOrderAction(id);
        if (!result.success) throw new Error(result.error);
        return id;
      },
      onSuccess: (id) => invalidateOrderQueries(id),
      onError: (err: Error) => showAlert(err.message),
    });

  const { mutate: mutateCompleteBill, isPending: isCompletingBill } =
    useMutation({
      networkMode: "always",
      mutationFn: async ({
        id,
        paymentMethod,
      }: {
        id: string;
        paymentMethod: PaymentMethod;
      }) => {
        // If the browser already knows it's offline, skip the network
        // attempt entirely and go straight to queueing — no need to
        // wait out a timeout when we already know there's no connection.
        const alreadyKnownOffline = paymentMethod === "cash" && !navigator.onLine;

        try {
          if (alreadyKnownOffline) {
            throw new Error("Offline");
          }
          const result = await withTimeout(completeBillAction(id, paymentMethod), 15000);
          if (!result.success) throw new Error(result.error);
          return { id, queuedOffline: false };
        } catch (err) {
          // Only cash gets an offline fallback — card/JazzCash/bank
          // require a live connection to ever be valid, so any failure
          // for those is a real error, not a connectivity queue candidate.
          if (paymentMethod !== "cash" || navigator.onLine) {
            throw err;
          }
          if (!currentStaff?.id || !currentStaff?.branchId) {
            throw err;
          }

          const clientPaymentId = crypto.randomUUID();
          await enqueuePendingPayment({
            clientPaymentId,
            orderId: id,
            paymentMethod,
            createdAt: Date.now(),
            attempts: 0,
            staffId: currentStaff.id,
            branchId: currentStaff.branchId,
          });
          return { id, queuedOffline: true };
        }
      },
      onSuccess: ({ id, queuedOffline }) => {
        invalidateOrderQueries(id);
        if (queuedOffline) {
          showAlert(
            "You're offline — this cash payment has been saved and will finish syncing once you're back online."
          );
        }
      },
      onError: (err: Error) => showAlert(err.message),
    });

  const { mutate: mutateCancelled, isPending: isCancelling } = useMutation({
    mutationFn: async (id: string) => {
      const result = await cancelOrderAction(id);
      if (!result.success) throw new Error(result.error);
      return id;
    },
    onSuccess: (id) => invalidateOrderQueries(id),
    onError: (err: Error) => showAlert(err.message),
  });

  const { mutate: mutateMarkReady, isPending: isMarkingReady } = useMutation({
    mutationFn: async ({ id, riderId }: { id: string; riderId: string | "auto" }) => {
      const result = await markOrderReadyAction(id, riderId);
      if (!result.success) throw new Error(result.error);
      return id;
    },
    onSuccess: (id) => invalidateOrderQueries(id),
    onError: (err: Error) => showAlert(err.message),
  });

  const canPrintKitchenTicket = !!order && order.status === "pending";
  const canMarkReady =
    !!order && order.orderType === "delivery" && order.status === "confirmed";
  const canPrintBill =
    !!order &&
    (order.orderType === "delivery"
      ? order.status === "ready_for_delivery" || order.status === "out_for_delivery" || order.status === "delivered"
      : order.status === "confirmed");
  const canCompleteBill =
    !!order &&
    (order.orderType === "delivery"
      ? order.status === "delivered"
      : order.status === "confirmed");
  const canCancel =
    !!order &&
    (order.status === "pending" || order.status === "confirmed" || order.status === "ready_for_delivery");

  return {
    order,
    isLoading,
    canPrintKitchenTicket,
    canMarkReady,
    canPrintBill,
    canCompleteBill,
    canCancel,
    printKitchenTicket: () => {
      if (!orderId || !canPrintKitchenTicket) return;
      mutateKitchenTicket(orderId);
    },
    isPrintingKitchenTicket,
    markReady: (riderId: string | "auto") => {
      if (!orderId || !canMarkReady) return;
      mutateMarkReady({ id: orderId, riderId });
    },
    isMarkingReady,
    completeBill: (paymentMethod: PaymentMethod = "cash") => {
      if (!orderId || !canPrintBill) return;
      mutateCompleteBill({ id: orderId, paymentMethod });
    },
    isCompletingBill,
    cancelOrder: () => {
      if (!orderId || !canCancel) return;
      mutateCancelled(orderId);
    },
    isCancelling,
  };
}