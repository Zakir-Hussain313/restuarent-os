"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import { getDeliveryAreasAction } from "@/features/delivery-areas/actions";
import { branchDeliveryAreas } from "@/db/schema";

type DeliveryArea = typeof branchDeliveryAreas.$inferSelect;

export interface UseDeliveryAreasReturn {
  areas: DeliveryArea[];
  isLoading: boolean;
  error: string | null;
}

export function useDeliveryAreas(branchId: string): UseDeliveryAreasReturn {
  const areasKey = queryKeys.deliveryAreas.list(branchId);

  const { data: areas = [], isLoading, error } = useQuery<DeliveryArea[]>({
    queryKey: areasKey,
    queryFn: async () => {
      const res = await getDeliveryAreasAction(branchId);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: !!branchId,
  });

  return { areas, isLoading, error: error instanceof Error ? error.message : null };
}