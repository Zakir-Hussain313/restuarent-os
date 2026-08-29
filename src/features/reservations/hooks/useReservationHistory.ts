"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getReservationHistoryAction } from "@/features/reservations/actions";
import type { TableReservation } from "@/db/schema";

export type ReservationDatePreset = "today" | "this_week" | "this_month" | null;

export interface ReservationDateRange {
    from: Date | null;
    to: Date | null;
}

/** Same bounds logic as useRiderHistory's computeRiderDateBounds. */
function computeReservationDateBounds(
    datePreset: ReservationDatePreset,
    dateRange: ReservationDateRange
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

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString() };
}

export function useReservationHistory() {
    const [datePreset, setDatePresetState] = useState<ReservationDatePreset>("today");
    const [dateRange, setDateRangeState] = useState<ReservationDateRange>({ from: null, to: null });
    const [history, setHistory] = useState<TableReservation[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const refetch = useCallback(() => {
        const { dateFrom, dateTo } = computeReservationDateBounds(datePreset, dateRange);
        startTransition(async () => {
            const result = await getReservationHistoryAction(dateFrom, dateTo);
            if (result.error || !result.data) {
                setError(result.error ?? "Failed to load history.");
                return;
            }
            setError(null);
            setHistory(result.data);
        });
    }, [datePreset, dateRange]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    function setDatePreset(preset: ReservationDatePreset) {
        setDatePresetState(preset);
        setDateRangeState({ from: null, to: null });
    }

    function setDateRange(range: ReservationDateRange) {
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
        error,
        isLoading: isPending,
        setDatePreset,
        setDateRange,
        resetFilters,
        isFiltered,
        refetch,
    };
}