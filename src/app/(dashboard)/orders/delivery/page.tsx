"use client";

import { useState, useCallback } from "react";
import { useDeliveryOrders } from "@/features/orders/hooks/useDeliveryOrders";
import { OrderDetail } from "@/features/orders/components/OrderDetail/OrderDetail";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Bike, Search, Utensils } from "lucide-react";
import { OrderListSkeleton } from "@/features/orders/shared/OrderListSkeleton";
import { OrderCard } from "@/features/orders/shared/OrderCard";

export default function DeliveryOrdersPage() {
  const {
    filteredOrders,
    filters,
    setSearch,
    isLoading,
    filteredCount,
  } = useDeliveryOrders();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const effectiveOrderId = selectedOrderId ?? filteredOrders[0]?.id ?? null;

  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId(id);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">
            Delivery Orders
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {filteredCount} on the way
          </span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-80 shrink-0 border-r flex flex-col">
          <div className="px-3 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search deliveries…"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <OrderListSkeleton />
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground px-4">
                <Bike className="w-8 h-8 opacity-30" />
                <p className="text-xs text-center">No delivery orders right now</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelected={order.id === effectiveOrderId}
                    onClick={() => handleSelectOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 min-w-0">
          {effectiveOrderId ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <OrderDetail orderId={effectiveOrderId} />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Utensils className="w-10 h-10 opacity-20" />
              <p className="text-sm">Select a delivery to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}