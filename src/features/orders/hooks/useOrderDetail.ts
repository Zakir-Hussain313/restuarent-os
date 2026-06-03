"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, createMockQueryFn } from "@/hooks/useMockQuery";
import { mockOrders } from "@/mock-data";
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

function updateOrderInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Order>
) {
  const now = new Date().toISOString();

  queryClient.setQueryData<Order>(
    queryKeys.orders.detail(id),
    (old) => (old ? { ...old, ...patch, updatedAt: now } : old)
  );

  queryClient.setQueryData<Order[]>(
    queryKeys.orders.all,
    (old) =>
      old?.map((o) =>
        o.id === id ? { ...o, ...patch, updatedAt: now } : o
      ) ?? []
  );
}

export function useOrderDetail(orderId: string | null): UseOrderDetailReturn {
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery<Order | undefined>({
    queryKey: queryKeys.orders.detail(orderId ?? ""),
    queryFn: createMockQueryFn(
      mockOrders.find((o) => o.id === orderId),
      200
    ),
    enabled: !!orderId,
    staleTime: Infinity,
  });

  const { mutate: mutateKitchenTicket, isPending: isPrintingKitchenTicket } =
    useMutation({
      mutationFn: (id: string): Promise<string> =>
        new Promise((resolve) => setTimeout(() => resolve(id), 400)),
      onSuccess: (id) => {
        updateOrderInCache(queryClient, id, {
          status: "confirmed" as OrderStatus,
          paymentStatus: "unpaid",
        });
      },
    });

  const { mutate: mutateCompleteBill, isPending: isCompletingBill } =
    useMutation({
      mutationFn: (id: string): Promise<string> =>
        new Promise((resolve) => setTimeout(() => resolve(id), 400)),
      onSuccess: (id) => {
        const now = new Date().toISOString();
        updateOrderInCache(queryClient, id, {
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
      updateOrderInCache(queryClient, id, {
        status: "cancelled" as OrderStatus,
      });
    },
  });

  const canPrintKitchenTicket = !!order && order.status === "pending";
  const canPrintBill = !!order && order.status === "confirmed";
  const canCancel =
    !!order &&
    (order.status === "pending" || order.status === "confirmed");

  return {
    order,
    isLoading,
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