"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getPosInitBundleAction, type PosInitBundle } from "@/features/pos/actions";

export const posInitQueryKey = (branchId?: string) => ["pos-init", branchId] as const;

export function usePosInit(branchId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PosInitBundle>({
    queryKey: posInitQueryKey(branchId),
    queryFn: async () => {
      const res = await getPosInitBundleAction(branchId);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    // Backstop for the offline coupon split staying fresh — realtime
    // ("coupons" broadcast) is the primary trigger, this just covers a
    // missed event. No-op while offline (default networkMode pauses it).
    refetchInterval: 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: posInitQueryKey(branchId) });
  }, [queryClient, branchId]);

  return { data, isLoading, error, invalidate };
}