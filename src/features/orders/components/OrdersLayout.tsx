"use client";

import { useState } from "react";
import { useOrders } from "../hooks/useOrders";
import { OrderStatsBar } from "./OrderList/OrderStatsBar";
import { OrderList } from "./OrderList/OrderList";
import { OrderDetail } from "./OrderDetail/OrderDetail";

export function OrdersLayout() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    orders,
    filteredOrders,
    filters,
    setStatusFilter,
    setOrderTypeFilter,
    setSearch,
    clearFilters,
    isLoading,
  } = useOrders();

  const hasActiveFilter =
    filters.status !== "all" ||
    filters.orderType !== "all" ||
    filters.search.trim().length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Stats topbar — full width ────────────────────────── */}
      <OrderStatsBar orders={orders} />

      {/* ── Split panel ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <div className="w-95 shrink-0 flex flex-col overflow-hidden">
          <OrderList
            orders={filteredOrders}
            allOrders={orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            isLoading={isLoading}
            search={filters.search}
            onSearchChange={setSearch}
            statusFilter={filters.status}
            onStatusChange={setStatusFilter}
            orderTypeFilter={filters.orderType}
            onOrderTypeChange={setOrderTypeFilter}
            onClearFilters={clearFilters}
            hasActiveFilter={hasActiveFilter}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden bg-background">
          <OrderDetail orderId={selectedOrderId} />
        </div>
      </div>
    </div>
  );
}