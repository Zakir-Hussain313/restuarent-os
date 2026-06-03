"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, createMockQueryFn } from "@/hooks/useMockQuery";
import { mockOrders } from "@/mock-data";
import type { Order, OrderStatus, OrderType } from "@/types";

export type OrderStatusFilter = OrderStatus | "all";
export type OrderTypeFilter = Exclude<OrderType, "walk_in"> | "all";

export interface OrderFilters {
  status: OrderStatusFilter;
  orderType: OrderTypeFilter;
  search: string;
}

interface UseOrdersOptions {
  scopeTypes?: OrderType[];
  scopeStatuses?: OrderStatus[];
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

const DEFAULT_FILTERS: OrderFilters = {
  status: "all",
  orderType: "all",
  search: "",
};

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const { scopeTypes, scopeStatuses } = options;

  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);

  const { data: allOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: queryKeys.orders.all,
    queryFn: createMockQueryFn(mockOrders, 400),
    staleTime: Infinity,
  });

  const scopedOrders = useMemo(() => {
    let result = [...allOrders];

    if (scopeTypes?.length) {
      result = result.filter((o) => scopeTypes.includes(o.orderType));
    }

    if (scopeStatuses?.length) {
      result = result.filter((o) => scopeStatuses.includes(o.status));
    }

    return result;
  }, [allOrders, scopeTypes, scopeStatuses]);

  const filteredOrders = useMemo(() => {
    let result = [...scopedOrders];

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
  }, [scopedOrders, filters]);

  return {
    orders: scopedOrders,
    filteredOrders,
    filters,
    setStatusFilter: (status) => setFilters((f) => ({ ...f, status })),
    setOrderTypeFilter: (orderType) => setFilters((f) => ({ ...f, orderType })),
    setSearch: (search) => setFilters((f) => ({ ...f, search })),
    clearFilters: () => setFilters(DEFAULT_FILTERS),
    isLoading,
    totalCount: scopedOrders.length,
    filteredCount: filteredOrders.length,
  };
}