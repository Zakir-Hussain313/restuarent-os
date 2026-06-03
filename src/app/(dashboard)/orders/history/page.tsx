"use client";

import { OrderHistoryLayout } from "@/features/orders/components/history/OrderHistoryLayout";
import { useOrderHistory } from "@/features/orders/hooks/useOrderHistory";

export default function OrderHistoryPage() {
  const {
    orders,
    isLoading,
    dateFilters,
    dishOptions,
    isFiltered,
    setDatePreset,
    setDateRange,
    setDishId,
    resetDateFilters,
  } = useOrderHistory();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Order History</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading orders…"
            : `${orders.length} ${orders.length === 1 ? "order" : "orders"} found`}
        </p>
      </div>

      <OrderHistoryLayout
        orders={orders}
        isLoading={isLoading}
        dateFilters={dateFilters}
        dishOptions={dishOptions}
        isFiltered={isFiltered}
        setDatePreset={setDatePreset}
        setDateRange={setDateRange}
        setDishId={setDishId}
        resetDateFilters={resetDateFilters}
      />
    </div>
  );
}