"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrdersAction, type GetOrdersFilters } from "../actions";
import { useRealtimeOrders } from "./useRealtimeOrders";
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
  dateFrom?: string;
  dateTo?: string;
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
  const { scopeTypes, scopeStatuses, dateFrom, dateTo } = options;
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  useRealtimeOrders();

  const serverFilters: GetOrdersFilters = {
    statuses: scopeStatuses,
    dateFrom,
    dateTo,
  };

  const { data: allOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders", scopeStatuses, dateFrom, dateTo],
    queryFn: async () => {
      const res = await getOrdersAction(undefined, serverFilters);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 60000, // safety-net fallback; realtime broadcast drives primary updates
  });

  const scopedOrders = useMemo(() => {
    let result = [...allOrders];

    if (scopeTypes?.length) {
      result = result.filter((o) => scopeTypes.includes(o.orderType));
    }

    return result;
  }, [allOrders, scopeTypes]);

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
      result = result.filter((o) => o.orderNumber.toLowerCase().includes(q));
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