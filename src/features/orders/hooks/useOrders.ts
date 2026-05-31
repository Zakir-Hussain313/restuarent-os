"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, createMockQueryFn } from "@/hooks/useMockQuery";
import { mockOrders } from "@/mock-data";
import type { Order, OrderStatus, OrderType } from "@/types";

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type OrderStatusFilter = OrderStatus | "all";
export type OrderTypeFilter = OrderType | "all";

export interface OrderFilters {
  status: OrderStatusFilter;
  orderType: OrderTypeFilter;
  search: string; // matches orderNumber or customerName
}

interface UseOrdersReturn {
  orders: Order[];
  filteredOrders: Order[];
  filters: OrderFilters;
  setStatusFilter: (status: OrderStatusFilter) => void;
  setOrderTypeFilter: (type: OrderTypeFilter) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
  isLoading: boolean;
  totalCount: number;
  filteredCount: number;
}

// ─── Default filters ──────────────────────────────────────────────────────────

const DEFAULT_FILTERS: OrderFilters = {
  status: "all",
  orderType: "all",
  search: "",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrders(): UseOrdersReturn {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: queryKeys.orders.all,
    queryFn: createMockQueryFn(mockOrders, 400),
    staleTime: Infinity,
  });

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Sort newest first
    result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filters.status !== "all") {
      result = result.filter((o) => o.status === filters.status);
    }

    if (filters.orderType !== "all") {
      result = result.filter((o) => o.orderType === filters.orderType);
    }

    if (filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerName ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, filters]);

  return {
    orders,
    filteredOrders,
    filters,
    setStatusFilter: (status) => setFilters((f) => ({ ...f, status })),
    setOrderTypeFilter: (orderType) => setFilters((f) => ({ ...f, orderType })),
    setSearch: (search) => setFilters((f) => ({ ...f, search })),
    clearFilters: () => setFilters(DEFAULT_FILTERS),
    isLoading,
    totalCount: orders.length,
    filteredCount: filteredOrders.length,
  };
}