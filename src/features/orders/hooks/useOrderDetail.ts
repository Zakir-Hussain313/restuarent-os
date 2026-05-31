"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, createMockQueryFn } from "@/hooks/useMockQuery";
import { mockOrders } from "@/mock-data";
import type { Order } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseOrderDetailReturn {
  order: Order | undefined;
  isLoading: boolean;
  canCancel: boolean;
  cancelOrder: () => void;
  isCancelling: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

  const { mutate: mutateCancelled, isPending: isCancelling } = useMutation({
    mutationFn: (id: string): Promise<string> =>
      new Promise((resolve) => setTimeout(() => resolve(id), 400)),
    onSuccess: (id: string) => {
      const now = new Date().toISOString();

      queryClient.setQueryData<Order>(
        queryKeys.orders.detail(id),
        (old) => (old ? { ...old, status: "cancelled", updatedAt: now } : old)
      );

      queryClient.setQueryData<Order[]>(
        queryKeys.orders.all,
        (old) =>
          old?.map((o) =>
            o.id === id ? { ...o, status: "cancelled", updatedAt: now } : o
          ) ?? []
      );
    },
  });

  const canCancel = !!order && order.status === "confirmed";

  return {
    order,
    isLoading,
    canCancel,
    cancelOrder: () => {
      if (!orderId || !canCancel) return;
      mutateCancelled(orderId);
    },
    isCancelling,
  };
}