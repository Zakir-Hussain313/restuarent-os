"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrderStore } from "@/store/useOrderStore";
import { queryKeys } from "@/hooks/useMockQuery";
import type { Order, OrderStatus } from "@/types";

interface UseOrderDetailReturn {
  order: Order | undefined;
  isLoading: boolean;
  canPrintKitchenTicket: boolean;
  canPrintBill: boolean;
  canCancel: boolean;
  printKitchenTicket: () => void;
  isPrintingKitchenTicket: boolean;
  completeBill: () => void;
  isCompletingBill: boolean;
  cancelOrder: () => void;
  isCancelling: boolean;
}

export function useOrderDetail(orderId: string | null): UseOrderDetailReturn {
  const queryClient = useQueryClient();
  const orders = useOrderStore((s) => s.orders);
  const updateOrder = useOrderStore((s) => s.updateOrder);

  const order = useMemo(
    () => (orderId ? orders.find((o) => o.id === orderId) : undefined),
    [orders, orderId]
  );

  function patchOrder(id: string, patch: Partial<Order>) {
    const now = new Date().toISOString();
    updateOrder(id, { ...patch, updatedAt: now });
    // Keep TanStack Query cache in sync for any components still reading from it
    queryClient.setQueryData<Order>(
      queryKeys.orders.detail(id),
      (old) => (old ? { ...old, ...patch, updatedAt: now } : old)
    );
  }

  const { mutate: mutateKitchenTicket, isPending: isPrintingKitchenTicket } =
    useMutation({
      mutationFn: (id: string): Promise<string> =>
        new Promise((resolve) => setTimeout(() => resolve(id), 400)),
      onSuccess: (id) => {
        patchOrder(id, { status: "confirmed" as OrderStatus, paymentStatus: "unpaid" });
      },
    });

  const { mutate: mutateCompleteBill, isPending: isCompletingBill } =
    useMutation({
      mutationFn: (id: string): Promise<string> =>
        new Promise((resolve) => setTimeout(() => resolve(id), 400)),
      onSuccess: (id) => {
        const now = new Date().toISOString();
        patchOrder(id, {
          status: "completed" as OrderStatus,
          paymentStatus: "paid",
          completedAt: now,
          totalPaid: order?.total ?? 0,
          balance: 0,
          payments: [
            ...(order?.payments ?? []),
            {
              id: `pay_${Date.now()}`,
              orderId: id,
              method: "cash",
              amount: order?.total ?? 0,
              processedAt: now,
              processedBy: "staff_001",
            },
          ],
        });
      },
    });

  const { mutate: mutateCancelled, isPending: isCancelling } = useMutation({
    mutationFn: (id: string): Promise<string> =>
      new Promise((resolve) => setTimeout(() => resolve(id), 400)),
    onSuccess: (id) => {
      patchOrder(id, { status: "cancelled" as OrderStatus });
    },
  });

  const canPrintKitchenTicket = !!order && order.status === "pending";
  const canPrintBill = !!order && order.status === "confirmed";
  const canCancel =
    !!order && (order.status === "pending" || order.status === "confirmed");

  return {
    order,
    isLoading: false,
    canPrintKitchenTicket,
    canPrintBill,
    canCancel,
    printKitchenTicket: () => {
      if (!orderId || !canPrintKitchenTicket) return;
      mutateKitchenTicket(orderId);
    },
    isPrintingKitchenTicket,
    completeBill: () => {
      if (!orderId || !canPrintBill) return;
      mutateCompleteBill(orderId);
    },
    isCompletingBill,
    cancelOrder: () => {
      if (!orderId || !canCancel) return;
      mutateCancelled(orderId);
    },
    isCancelling,
  };
}