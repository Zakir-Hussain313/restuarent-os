"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  getPublicBranchInfoAction,
  getPublicDeliveryAreasAction,
  getPublicMenuAction,
} from "@/features/online-ordering/actions";

// ─── Branch info — tells the page whether to show the location modal ────

export function usePublicBranchInfo() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.branchInfo,
    queryFn: async () => {
      const res = await getPublicBranchInfoAction();
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  return { branchInfo: data, isLoading };
}

// ─── Delivery areas, grouped by city, for the location modal ────────────

export function usePublicDeliveryAreas() {
  const { data: cities = [], isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.deliveryAreas,
    queryFn: async () => {
      const res = await getPublicDeliveryAreasAction();
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  return { cities, isLoading };
}

// ─── Menu for the resolved branch ────────────────────────────────────────

export function usePublicMenu(branchId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.menu(branchId ?? ""),
    queryFn: async () => {
      if (!branchId) throw new Error("No branch selected.");
      const res = await getPublicMenuAction(branchId);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: !!branchId,
  });

  return { categories: data?.categories ?? [], items: data?.items ?? [], isLoading };
}