"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import { listCouponsAdminAction } from "@/features/coupons/actions";
import type { Coupon } from "@/db/schema/orders";

export interface UseCouponsReturn {
  coupons: Coupon[];
  currentBranchId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CouponsQueryResult {
  coupons: Coupon[];
  currentBranchId: string | null;
}

export function useCoupons(): UseCouponsReturn {
  const { data, isLoading, error } = useQuery<CouponsQueryResult>({
    queryKey: queryKeys.coupons.list,
    queryFn: async () => {
      const res = await listCouponsAdminAction();
      if (res.data === null) throw new Error(res.error);
      return { coupons: res.data, currentBranchId: res.currentBranchId };
    },
  });

  return {
    coupons: data?.coupons ?? [],
    currentBranchId: data?.currentBranchId ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}