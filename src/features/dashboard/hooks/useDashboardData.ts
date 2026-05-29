import { useQuery } from "@tanstack/react-query";
import { createMockQueryFn, queryKeys } from "@/hooks/useMockQuery";
import { mockDashboardReport, mockRevenueChart } from "@/mock-data/analytics";
import { mockOrders } from "@/mock-data/orders";
import { mockTables } from "@/mock-data/tables";

// Computed once at module level — stable references
const RECENT_ORDERS = [...mockOrders]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 6);

const REVENUE_SLICES = {
  "7d": mockRevenueChart.slice(-7),
  "30d": mockRevenueChart.slice(-30),
  "90d": mockRevenueChart.slice(-90),
} as const;

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard,
    queryFn: createMockQueryFn(mockDashboardReport.stats, 400),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useRevenueData(range: "7d" | "30d" | "90d" = "30d") {
  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "revenue", range],
    queryFn: createMockQueryFn(REVENUE_SLICES[range], 500),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useTopDishes() {
  return useQuery({
    queryKey: [...queryKeys.analytics.dashboard, "top-items"],
    queryFn: createMockQueryFn(mockDashboardReport.topItems.slice(0, 4), 450),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useRecentOrders() {
  return useQuery({
    queryKey: [...queryKeys.orders.all, "recent"],
    queryFn: createMockQueryFn(RECENT_ORDERS, 350),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useTableOccupancy() {
  return useQuery({
    queryKey: queryKeys.tables.all,
    queryFn: createMockQueryFn(mockTables, 300),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}