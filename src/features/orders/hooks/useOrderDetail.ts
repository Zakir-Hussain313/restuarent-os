"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  getOrderByIdAction,
  confirmOrderAction,
  completeBillAction,
  cancelOrderAction,
} from "@/features/orders/actions";
import type { Order, PaymentMethod } from "@/types";

interface UseOrderDetailReturn {
  order: Order | undefined;
  isLoading: boolean;
  canPrintKitchenTicket: boolean;
  canPrintBill: boolean;
  canCancel: boolean;
  printKitchenTicket: () => void;
  isPrintingKitchenTicket: boolean;
  completeBill: (paymentMethod?: PaymentMethod) => void;
  isCompletingBill: boolean;
  cancelOrder: () => void;
  isCancelling: boolean;
}

export function useOrderDetail(orderId: string | null): UseOrderDetailReturn {
  const queryClient = useQueryClient();

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
      onError: (err: Error) => alert(err.message),
    });

  const { mutate: mutateCompleteBill, isPending: isCompletingBill } =
    useMutation({
      mutationFn: async ({
        id,
        paymentMethod,
      }: {
        id: string;
        paymentMethod: PaymentMethod;
      }) => {
        const result = await completeBillAction(id, paymentMethod);
        if (!result.success) throw new Error(result.error);
        return id;
      },
      onSuccess: (id) => invalidateOrderQueries(id),
      onError: (err: Error) => alert(err.message),
    });

  const { mutate: mutateCancelled, isPending: isCancelling } = useMutation({
    mutationFn: async (id: string) => {
      const result = await cancelOrderAction(id);
      if (!result.success) throw new Error(result.error);
      return id;
    },
    onSuccess: (id) => invalidateOrderQueries(id),
    onError: (err: Error) => alert(err.message),
  });

  const canPrintKitchenTicket = !!order && order.status === "pending";
  const canPrintBill = !!order && order.status === "confirmed";
  const canCancel =
    !!order && (order.status === "pending" || order.status === "confirmed");

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