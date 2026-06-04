import { useState, useMemo } from "react";
import { useOrders } from "./useOrders";
import type { Order } from "@/types";

export type DatePreset = "today" | "this_week" | "this_month" | null;
export type OrderTypeFilter = "dine_in" | "takeaway" | "delivery" | null;

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface HistoryDateFilters {
  datePreset: DatePreset;
  dateRange: DateRange;
  dishId: string | null;
  orderType: OrderTypeFilter;
}

export interface DishOption {
  menuItemId: string;
  menuItemName: string;
}

const DEFAULT_DATE_FILTERS: HistoryDateFilters = {
  datePreset: null,
  dateRange: { from: null, to: null },
  dishId: null,
  orderType: null,
};

function isWithinPreset(dateString: string, preset: DatePreset): boolean {
  if (!preset) return true;
  const date = new Date(dateString);
  const now = new Date();

  if (preset === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (preset === "this_week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
  }

  if (preset === "this_month") {
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  return true;
}

function isWithinRange(dateString: string, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  const date = new Date(dateString);
  if (range.from && date < range.from) return false;
  if (range.to) {
    const endOfDay = new Date(range.to);
    endOfDay.setHours(23, 59, 59, 999);
    if (date > endOfDay) return false;
  }
  return true;
}

function applyDateAndDishFilters(
  orders: Order[],
  dateFilters: HistoryDateFilters
): Order[] {
  return orders.filter((order) => {
    // Date preset or range
    if (dateFilters.datePreset) {
      if (!isWithinPreset(order.createdAt, dateFilters.datePreset)) return false;
    } else {
      if (!isWithinRange(order.createdAt, dateFilters.dateRange)) return false;
    }

    // Dish filter
    if (dateFilters.dishId) {
      const hasDish = order.items.some(
        (item) => item.menuItemId === dateFilters.dishId
      );
      if (!hasDish) return false;
    }

    // Order type filter
    if (dateFilters.orderType) {
      if (order.orderType !== dateFilters.orderType) return false;
    }

    return true;
  });
}

export function useOrderHistory() {
  const [dateFilters, setDateFilters] =
    useState<HistoryDateFilters>(DEFAULT_DATE_FILTERS);

  const base = useOrders({
    scopeStatuses: ["completed", "cancelled"],
  });

  const dishOptions = useMemo<DishOption[]>(() => {
    const seen = new Map<string, string>();
    for (const order of base.orders) {
      for (const item of order.items) {
        if (!seen.has(item.menuItemId)) {
          seen.set(item.menuItemId, item.menuItemName);
        }
      }
    }
    return Array.from(seen.entries()).map(([menuItemId, menuItemName]) => ({
      menuItemId,
      menuItemName,
    }));
  }, [base.orders]);

  const orders = useMemo(
    () => applyDateAndDishFilters(base.filteredOrders, dateFilters),
    [base.filteredOrders, dateFilters]
  );

  const isDateFiltered =
    dateFilters.datePreset !== null ||
    dateFilters.dateRange.from !== null ||
    dateFilters.dateRange.to !== null;

  const isDishFiltered = dateFilters.dishId !== null;
  const isOrderTypeFiltered = dateFilters.orderType !== null;

  const isFiltered = isDateFiltered || isDishFiltered || isOrderTypeFiltered;

  function setDatePreset(preset: DatePreset) {
    setDateFilters((prev) => ({
      ...prev,
      datePreset: preset,
      dateRange: { from: null, to: null },
    }));
  }

  function setDateRange(range: DateRange) {
    setDateFilters((prev) => ({
      ...prev,
      datePreset: null,
      dateRange: range,
    }));
  }

  function setDishId(dishId: string | null) {
    setDateFilters((prev) => ({ ...prev, dishId }));
  }

  function setOrderType(orderType: OrderTypeFilter) {
    setDateFilters((prev) => ({ ...prev, orderType }));
  }

  function resetDateFilters() {
    setDateFilters(DEFAULT_DATE_FILTERS);
  }

  return {
    orders,
    isLoading: base.isLoading,
    filters: base.filters,
    setStatusFilter: base.setStatusFilter,
    setOrderTypeFilter: base.setOrderTypeFilter,
    setSearch: base.setSearch,
    clearFilters: base.clearFilters,
    totalCount: base.totalCount,
    filteredCount: orders.length,
    dateFilters,
    setDatePreset,
    setDateRange,
    setDishId,
    setOrderType,
    resetDateFilters,
    isFiltered,
    isDateFiltered,
    isDishFiltered,
    isOrderTypeFiltered,
    dishOptions,
  };
}