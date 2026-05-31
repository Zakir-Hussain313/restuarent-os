"use client";

import { ClipboardList } from "lucide-react";
import { OrderListHeader } from "./OrderListHeader";
import { OrderRow } from "./OrderRow";
import type { Order } from "@/types";
import type { OrderStatusFilter, OrderTypeFilter } from "../../hooks/useOrders";

interface OrderListProps {
  orders: Order[];
  allOrders: Order[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  isLoading: boolean;
  // filter props
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: OrderStatusFilter;
  onStatusChange: (v: OrderStatusFilter) => void;
  orderTypeFilter: OrderTypeFilter;
  onOrderTypeChange: (v: OrderTypeFilter) => void;
  onClearFilters: () => void;
  hasActiveFilter: boolean;
}

function SkeletonRow() {
  return (
    <div className="px-3 py-3 border-b animate-pulse space-y-2">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-10 bg-muted rounded" />
      </div>
      <div className="h-3 w-28 bg-muted rounded" />
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-muted rounded-full" />
        <div className="h-3 w-14 bg-muted rounded" />
      </div>
    </div>
  );
}

export function OrderList({
  orders,
  selectedOrderId,
  onSelectOrder,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  orderTypeFilter,
  onOrderTypeChange,
  onClearFilters,
  hasActiveFilter,
}: OrderListProps) {
  return (
    <div className="flex flex-col h-full border-r overflow-hidden">

      {/* Filters */}
      <OrderListHeader
        search={search}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        orderTypeFilter={orderTypeFilter}
        onOrderTypeChange={onOrderTypeChange}
        onClearFilters={onClearFilters}
        hasActiveFilter={hasActiveFilter}
      />

      {/* Orders list — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No orders found</p>
            {hasActiveFilter && (
              <button
                onClick={onClearFilters}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              isSelected={selectedOrderId === order.id}
              onClick={() => onSelectOrder(order.id)}
            />
          ))
        )}
      </div>

      {/* Footer count */}
      <div className="shrink-0 px-3 py-2 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
          {hasActiveFilter ? " (filtered)" : ""}
        </p>
      </div>
    </div>
  );
}