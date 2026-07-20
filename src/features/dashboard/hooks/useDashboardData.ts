import { useQuery } from "@tanstack/react-query";
import { createMockQueryFn, queryKeys } from "@/hooks/useMockQuery";
import { mockDashboardReport } from "@/mock-data/analytics";
import { getDashboardStatsAction, getRecentOrdersAction, getRevenueDataAction, getTableOccupancyAction, getTopDishesAction } from "../actions";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: async () => {
      const result = await getDashboardStatsAction();
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
  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "revenue", range],
    queryFn: async () => {
      const result = await getRevenueDataAction(range);
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
  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "top-items"],
    queryFn: async () => {
      const result = await getTopDishesAction();
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
  return useQuery({
    queryKey: [...queryKeys.orders.all, "recent"],
    queryFn: async () => {
      const result = await getRecentOrdersAction();
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
  return useQuery({
    queryKey: queryKeys.tables.all,
    queryFn: async () => {
      const result = await getTableOccupancyAction();
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
  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "order-type-breakdown"],
    queryFn: createMockQueryFn(mockDashboardReport.orderTypeBreakdown, 420),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}