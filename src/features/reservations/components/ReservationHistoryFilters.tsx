"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import type {
    ReservationDatePreset,
    ReservationDateRange,
} from "../hooks/useReservationHistory";

interface ReservationHistoryFiltersProps {
    datePreset: ReservationDatePreset;
    dateRange: ReservationDateRange;
    isFiltered: boolean;
    setDatePreset: (preset: ReservationDatePreset) => void;
    setDateRange: (range: ReservationDateRange) => void;
    resetFilters: () => void;
}

const DATE_PRESETS: { label: string; value: ReservationDatePreset }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
];

export function ReservationHistoryFilters({
    datePreset,
    dateRange,
    isFiltered,
    setDatePreset,
    setDateRange,
    resetFilters,
}: ReservationHistoryFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
                {DATE_PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        onClick={() => setDatePreset(preset.value)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                            datePreset === preset.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                        )}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-1.5">
                <DatePicker
                    value={dateRange.from}
                    max={dateRange.to ?? new Date()}
                    onChange={(date) => setDateRange({ ...dateRange, from: date })}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <DatePicker
                    value={dateRange.to}
                    min={dateRange.from}
                    max={new Date()}
                    onChange={(date) => setDateRange({ ...dateRange, to: date })}
                />
            </div>

            {isFiltered && (
                <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                >
                    <X className="w-3.5 h-3.5" />
                    Clear
                </button>
            )}
        </div>
    );
}