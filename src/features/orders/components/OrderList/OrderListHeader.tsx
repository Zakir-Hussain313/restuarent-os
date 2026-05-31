"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatusFilter, OrderTypeFilter } from "../../hooks/useOrders";

interface OrderListHeaderProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: OrderStatusFilter;
  onStatusChange: (v: OrderStatusFilter) => void;
  orderTypeFilter: OrderTypeFilter;
  onOrderTypeChange: (v: OrderTypeFilter) => void;
  onClearFilters: () => void;
  hasActiveFilter: boolean;
}

const STATUS_OPTIONS: { value: OrderStatusFilter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS: { value: OrderTypeFilter; label: string }[] = [
  { value: "all",      label: "All Types" },
  { value: "dine_in",  label: "Dine In" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
];

export function OrderListHeader({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  orderTypeFilter,
  onOrderTypeChange,
  onClearFilters,
  hasActiveFilter,
}: OrderListHeaderProps) {
  return (
    <div className="px-3 py-3 space-y-2 border-b">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Order # or customer name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-8 pl-8 pr-8 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filter — scrollable pill row */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={cn(
              "shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap",
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Order type filter + clear */}
      <div className="flex items-center gap-1">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onOrderTypeChange(opt.value)}
            className={cn(
              "shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors whitespace-nowrap",
              orderTypeFilter === opt.value
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
        {hasActiveFilter && (
          <button
            onClick={onClearFilters}
            className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}