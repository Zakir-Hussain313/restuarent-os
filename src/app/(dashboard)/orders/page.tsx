"use client";

import { useState, useCallback } from "react";
import { useActiveOrders } from "@/features/orders/hooks/useActiveOrders";
import { OrderDetail } from "@/features/orders/components/OrderDetail/OrderDetail";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, Utensils, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrderListSkeleton } from "@/features/orders/shared/OrderListSkeleton";
import { OrderCard } from "@/features/orders/shared/OrderCard";

export default function ActiveOrdersPage() {
  const {
    filteredOrders,
    filters,
    setSearch,
    isLoading,
    filteredCount,
  } = useActiveOrders();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const effectiveOrderId = selectedOrderId ?? filteredOrders[0]?.id ?? null;
  const showingDetailOnMobile = selectedOrderId !== null;

  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId(id);
  }, []);

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          {showingDetailOnMobile && (
            <button
              onClick={() => setSelectedOrderId(null)}
              className="lg:hidden text-muted-foreground hover:text-foreground -ml-1 p-1"
              aria-label="Back to order list"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-foreground">
            Active Orders
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
            {filteredCount} active
          </span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div
          className={cn(
            "w-full lg:w-80 lg:shrink-0 border-r flex-col min-h-0",
            showingDetailOnMobile ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="px-3 py-3 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search orders…"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <OrderListSkeleton />
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground px-4">
                <ClipboardList className="w-8 h-8 opacity-30" />
                <p className="text-xs text-center">No active orders right now</p>
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

        <div
          className={cn(
            "flex-1 min-w-0",
            showingDetailOnMobile ? "flex" : "hidden lg:flex"
          )}
        >
          {effectiveOrderId ? (
            <div className="h-full w-full p-4 sm:p-6">
              <OrderDetail orderId={effectiveOrderId} />
            </div>
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