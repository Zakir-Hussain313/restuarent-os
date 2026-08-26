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
  datePreset: "today",
  dateRange: { from: null, to: null },
  dishId: null,
  orderType: null,
};

/** Computes the [from, to] ISO bounds to send to the server for a given preset/range. */
function computeServerDateBounds(
  dateFilters: HistoryDateFilters
): { dateFrom: string; dateTo?: string } {
  const now = new Date();

  if (dateFilters.datePreset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString() };
  }

  if (dateFilters.datePreset === "this_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString() };
  }

  if (dateFilters.datePreset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: start.toISOString() };
  }

  if (dateFilters.dateRange.from || dateFilters.dateRange.to) {
    const from = dateFilters.dateRange.from ?? new Date(0);
    let to: string | undefined;
    if (dateFilters.dateRange.to) {
      const endOfDay = new Date(dateFilters.dateRange.to);
      endOfDay.setHours(23, 59, 59, 999);
      to = endOfDay.toISOString();
    }
    return { dateFrom: from.toISOString(), dateTo: to };
  }

  // No preset, no range — fall back to "today" rather than unbounded history.
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return { dateFrom: start.toISOString() };
}

function applyDishAndTypeFilters(
  orders: Order[],
  dateFilters: HistoryDateFilters
): Order[] {
  return orders.filter((order) => {
    if (dateFilters.dishId) {
      const hasDish = order.items.some(
        (item) => item.menuItemId === dateFilters.dishId
      );
      if (!hasDish) return false;
    }

    if (dateFilters.orderType) {
      if (order.orderType !== dateFilters.orderType) return false;
    }

    return true;
  });
}

export function useOrderHistory() {
  const [dateFilters, setDateFilters] =
    useState<HistoryDateFilters>(DEFAULT_DATE_FILTERS);

  const { dateFrom, dateTo } = computeServerDateBounds(dateFilters);

  const base = useOrders({
    scopeStatuses: ["completed", "cancelled"],
    dateFrom,
    dateTo,
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
    () => applyDishAndTypeFilters(base.filteredOrders, dateFilters),
    [base.filteredOrders, dateFilters]
  );

  const isDateFiltered =
    (dateFilters.datePreset !== null && dateFilters.datePreset !== "today") ||
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