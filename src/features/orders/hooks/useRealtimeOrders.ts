"use client";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import { useAuthStore } from "@/store/useAuthStore";

export function useRealtimeOrders() {

  const queryClient = useQueryClient();
  const currentStaff = useAuthStore((s) => s.currentStaff);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const branchId = isHydrated ? currentStaff?.branchId : undefined;

  const onEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }, [queryClient]);
  
  useBranchChannel(branchId, "orders", onEvent);
}