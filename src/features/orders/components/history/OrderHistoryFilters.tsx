"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import type {
  DatePreset,
  DateRange,
  DishOption,
  OrderTypeFilter,
} from "../../hooks/useOrderHistory";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface OrderHistoryFiltersProps {
  dateFilters: {
    datePreset: DatePreset;
    dateRange: DateRange;
    dishId: string | null;
    orderType: OrderTypeFilter;
  };
  dishOptions: DishOption[];
  isFiltered: boolean;
  setDatePreset: (preset: DatePreset) => void;
  setDateRange: (range: DateRange) => void;
  setDishId: (id: string | null) => void;
  setOrderType: (type: OrderTypeFilter) => void;
  resetDateFilters: () => void;
}

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
];

const ORDER_TYPE_OPTIONS: { label: string; value: NonNullable<OrderTypeFilter> }[] = [
  { label: "Dine In", value: "dine_in" },
  { label: "Takeaway", value: "takeaway" },
  { label: "Delivery", value: "delivery" },
];

// toInputValue / fromInputValue removed — no longer needed with DatePicker

export function OrderHistoryFilters({
  dateFilters,
  dishOptions,
  isFiltered,
  setDatePreset,
  setDateRange,
  setDishId,
  setOrderType,
  resetDateFilters,
}: OrderHistoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date preset pills */}
      <div className="flex items-center gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() =>
              setDatePreset(
                dateFilters.datePreset === preset.value ? null : preset.value
              )
            }
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
              dateFilters.datePreset === preset.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-5 w-px bg-border" />

      {/* Date range inputs */}
      <div className="flex items-center gap-2">
        <DatePicker
          value={dateFilters.dateRange.from}
          max={dateFilters.dateRange.to ?? new Date()}
          onChange={(date) =>
            setDateRange({ ...dateFilters.dateRange, from: date })
          }
        />
        <span className="text-xs text-muted-foreground">to</span>
        <DatePicker
          value={dateFilters.dateRange.to}
          min={dateFilters.dateRange.from}
          max={new Date()}
          onChange={(date) =>
            setDateRange({ ...dateFilters.dateRange, to: date })
          }
        />
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Order type pills */}
      <div className="flex items-center gap-1.5">
        {ORDER_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() =>
              setOrderType(
                dateFilters.orderType === option.value ? null : option.value
              )
            }
            className={cn(
              "px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
              dateFilters.orderType === option.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Dish dropdown */}
      <Select value={dateFilters.dishId ?? "all"} onValueChange={(v) => setDishId(v === "all" ? null : v)}>
        <SelectTrigger className="h-8 w-auto text-xs">
          <SelectValue placeholder="All Dishes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Dishes</SelectItem>
          {dishOptions.map((dish) => (
            <SelectItem key={dish.menuItemId} value={dish.menuItemId}>
              {dish.menuItemName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {isFiltered && (
        <button
          onClick={resetDateFilters}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}