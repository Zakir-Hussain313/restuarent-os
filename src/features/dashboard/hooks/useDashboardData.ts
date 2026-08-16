import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import { useSearchParams } from "next/navigation";
import {
  getDashboardStatsAction,
  getRevenueDataAction,
  getTopDishesAction,
  getRecentOrdersAction,
  getTableOccupancyAction,
  getOrderTypeBreakdownAction,
  getReservationStatsAction,
} from "../actions";

export function useDashboardStats() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "stats", branch],
    queryFn: async () => {
      const result = await getDashboardStatsAction(branch);
      if (result.error || !result.stats) {
        throw new Error(result.error ?? "Failed to load dashboard stats.");
      }
      return result.stats;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

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

export function useTopDishes() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "top-items", branch],
    queryFn: async () => {
      const result = await getTopDishesAction(branch);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to load top dishes.");
      }
      return result.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useRecentOrders() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.orders.all, "recent", branch],
    queryFn: async () => {
      const result = await getRecentOrdersAction(branch);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to load recent orders.");
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

export function useOrderTypeBreakdown() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "order-type-breakdown", branch],
    queryFn: async () => {
      const result = await getOrderTypeBreakdownAction(branch);
      if (result.error || !result.data) {
        throw new Error(result.error ?? "Failed to load order type breakdown.");
      }
      return result.data;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useReservationStats() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") ?? undefined;

  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "reservation-stats", branch],
    queryFn: async () => {
      const result = await getReservationStatsAction(branch);
      if (result.error || !result.stats) {
        throw new Error(result.error ?? "Failed to load reservation stats.");
      }
      return result.stats;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}