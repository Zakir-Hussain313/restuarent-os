"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DatePreset,
  DateRange,
  DishOption,
} from "../../hooks/useOrderHistory";

interface OrderHistoryFiltersProps {
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

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
];

function toInputValue(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromInputValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function OrderHistoryFilters({
  dateFilters,
  dishOptions,
  isFiltered,
  setDatePreset,
  setDateRange,
  setDishId,
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
      <div className="h-5 w-px bg-border" />

      {/* Date range inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={toInputValue(dateFilters.dateRange.from)}
          max={toInputValue(dateFilters.dateRange.to ?? new Date())}
          onChange={(e) =>
            setDateRange({
              ...dateFilters.dateRange,
              from: fromInputValue(e.target.value),
            })
          }
          className={cn(
            "h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "cursor-pointer"
          )}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="date"
          value={toInputValue(dateFilters.dateRange.to)}
          min={toInputValue(dateFilters.dateRange.from)}
          max={toInputValue(new Date())}
          onChange={(e) =>
            setDateRange({
              ...dateFilters.dateRange,
              to: fromInputValue(e.target.value),
            })
          }
          className={cn(
            "h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "cursor-pointer"
          )}
        />
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Dish dropdown */}
      <select
        value={dateFilters.dishId ?? ""}
        onChange={(e) => setDishId(e.target.value || null)}
        className={cn(
          "h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          "cursor-pointer"
        )}
      >
        <option value="">All Dishes</option>
        {dishOptions.map((dish) => (
          <option key={dish.menuItemId} value={dish.menuItemId}>
            {dish.menuItemName}
          </option>
        ))}
      </select>

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