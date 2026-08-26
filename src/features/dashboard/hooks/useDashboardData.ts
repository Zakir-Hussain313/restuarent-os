import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import { useSearchParams } from "next/navigation";
import { subscribeBranchChannel } from "@/lib/realtime/channelRegistry";
import {
  getRevenueDataAction,
  getTableOccupancyAction,
  getDashboardBundleAction,
} from "../actions";

export function useRevenueData(range: "7d" | "30d" | "90d" = "30d") {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "revenue", range, branch],
    queryFn: async () => {
      const result = await getRevenueDataAction(range, branch);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to load revenue data.");
      }
      return result.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useTableOccupancy() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.tables.all, branch],
    queryFn: async () => {
      const result = await getTableOccupancyAction(branch);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to load table occupancy.");
      }
      return result.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useDashboardBundle(range: "7d" | "30d" | "90d" = "30d") {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;
  const queryClient = useQueryClient();
  const queryKey = [...queryKeys.analytics.dashboard, "bundle", range, branch];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getDashboardBundleAction(range, branch);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to load dashboard data.");
      }
      return result.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const branchScope = query.data?.branchId ?? null;
  const allBranchIds = query.data?.allBranchIds;
  // Stable key so the effect below doesn't re-subscribe on every render.
  const allBranchIdsKey = allBranchIds?.join(",") ?? "";

  const invalidate = useRef(() => {
    queryClient.invalidateQueries({ queryKey });
  });
  useEffect(() => {
    invalidate.current = () => queryClient.invalidateQueries({ queryKey });
  });

  useEffect(() => {
    const branchIds = branchScope
      ? [branchScope]
      : allBranchIdsKey
      ? allBranchIdsKey.split(",")
      : [];

    if (branchIds.length === 0) return;

    const unsubscribes = branchIds.flatMap((id) => [
      subscribeBranchChannel(id, "orders", () => invalidate.current()),
      subscribeBranchChannel(id, "tables", () => invalidate.current()),
    ]);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [branchScope, allBranchIdsKey]);

  return query;
}