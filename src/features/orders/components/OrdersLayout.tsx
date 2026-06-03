"use client";

import { useState } from "react";
import { useOrders } from "../hooks/useOrders";
import { OrderStatsBar } from "./OrderList/OrderStatsBar";
import { OrderList } from "./OrderList/OrderList";
import { OrderDetail } from "./OrderDetail/OrderDetail";
import { Utensils } from "lucide-react";

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

      <OrderStatsBar orders={orders} />

      <div className="flex flex-1 overflow-hidden">

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

        <div className="flex-1 overflow-hidden bg-background">
          {selectedOrderId ? (
            <OrderDetail orderId={selectedOrderId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Utensils className="w-10 h-10 opacity-20" />
              <p className="text-sm">Select an order to view details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}