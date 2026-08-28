"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
    getRiderHistoryAction,
    type RiderHistoryEntry,
    type RiderRevenueSummary,
} from "@/features/deliveries/actions";

export type RiderDatePreset = "today" | "this_week" | "this_month" | null;

export interface RiderDateRange {
    from: Date | null;
    to: Date | null;
}

/** Same bounds logic as useOrderHistory's computeServerDateBounds, adapted locally
 *  since this hook has no dish/order-type filtering and lives in a different feature. */
function computeRiderDateBounds(
    datePreset: RiderDatePreset,
    dateRange: RiderDateRange
): { dateFrom: string; dateTo?: string } {
    const now = new Date();

    if (datePreset === "today") {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { dateFrom: start.toISOString() };
    }

    if (datePreset === "this_week") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { dateFrom: start.toISOString() };
    }

    if (datePreset === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { dateFrom: start.toISOString() };
    }

    if (dateRange.from || dateRange.to) {
        const from = dateRange.from ?? new Date(0);
        let to: string | undefined;
        if (dateRange.to) {
            const endOfDay = new Date(dateRange.to);
            endOfDay.setHours(23, 59, 59, 999);
            to = endOfDay.toISOString();
        }
        return { dateFrom: from.toISOString(), dateTo: to };
    }

    // No preset, no range — fall back to "today" rather than unbounded history.
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString() };
}

export function useRiderHistory() {
    const [datePreset, setDatePresetState] = useState<RiderDatePreset>("today");
    const [dateRange, setDateRangeState] = useState<RiderDateRange>({ from: null, to: null });
    const [history, setHistory] = useState<RiderHistoryEntry[]>([]);
    const [summary, setSummary] = useState<RiderRevenueSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const refetch = useCallback(() => {
        const { dateFrom, dateTo } = computeRiderDateBounds(datePreset, dateRange);
        startTransition(async () => {
            const result = await getRiderHistoryAction(dateFrom, dateTo);
            if (!result.success) {
                setError(result.error);
                return;
            }
            setError(null);
            setHistory(result.history);
            setSummary(result.summary);
        });
    }, [datePreset, dateRange]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    function setDatePreset(preset: RiderDatePreset) {
        setDatePresetState(preset);
        setDateRangeState({ from: null, to: null });
    }

    function setDateRange(range: RiderDateRange) {
        setDatePresetState(null);
        setDateRangeState(range);
    }

    function resetFilters() {
        setDatePresetState("today");
        setDateRangeState({ from: null, to: null });
    }

    const isFiltered =
        datePreset !== "today" || dateRange.from !== null || dateRange.to !== null;

    return {
        datePreset,
        dateRange,
        history,
        summary,
        error,
        isLoading: isPending,
        setDatePreset,
        setDateRange,
        resetFilters,
        isFiltered,
        refetch,
    };
}