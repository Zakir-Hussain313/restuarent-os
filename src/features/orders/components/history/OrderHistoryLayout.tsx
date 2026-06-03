"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderHistoryFilters } from "./OrderHistoryFilters";
import { OrderHistoryTable } from "./OrderHistoryTable";
import { OrderDetail } from "@/features/orders/components/OrderDetail/OrderDetail";
import type {
  DatePreset,
  DateRange,
  DishOption,
} from "@/features/orders/hooks/useOrderHistory";
import type { Order } from "@/types/order";

interface OrderHistoryLayoutProps {
  orders: Order[];
  isLoading: boolean;
  dateFilters: {
    datePreset: DatePreset;
    dateRange: DateRange;
    dishId: string | null;
  };
  dishOptions: DishOption[];
  isFiltered: boolean;
  setDatePreset: (preset: DatePreset) => void;
  setDateRange: (range: DateRange) => void;
  setDishId: (id: string | null) => void;
  resetDateFilters: () => void;
}

export function OrderHistoryLayout({
  orders,
  isLoading,
  dateFilters,
  dishOptions,
  isFiltered,
  setDatePreset,
  setDateRange,
  setDishId,
  resetDateFilters,
}: OrderHistoryLayoutProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSelectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedOrderId(null);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <OrderHistoryFilters
        dateFilters={dateFilters}
        dishOptions={dishOptions}
        isFiltered={isFiltered}
        setDatePreset={setDatePreset}
        setDateRange={setDateRange}
        setDishId={setDishId}
        resetDateFilters={resetDateFilters}
      />

      <OrderHistoryTable
        orders={orders}
        isLoading={isLoading}
        selectedOrderId={selectedOrderId}
        onSelectOrder={handleSelectOrder}
      />

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 flex flex-col"
        >
          <SheetHeader className="px-6 pt-6 pb-0 shrink-0">
            <SheetTitle className="text-base font-semibold text-foreground">
              Order Detail
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 pb-6 mt-4">
            {selectedOrderId && (
              <OrderDetail orderId={selectedOrderId} />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}