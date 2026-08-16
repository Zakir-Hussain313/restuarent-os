// src/features/reports/lib/formatReportDate.ts
import { RESTAURANT_CONFIG } from "@/config/restaurant";

export function formatReportDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const endExclusive = new Date(endIso);
  const displayEnd = new Date(endExclusive.getTime() - 1);

  const startLabel = start.toLocaleDateString(RESTAURANT_CONFIG.locale, { day: "numeric", month: "short", year: "numeric" });
  const endLabel = displayEnd.toLocaleDateString(RESTAURANT_CONFIG.locale, { day: "numeric", month: "short", year: "numeric" });

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export function formatReportTimestamp(date: Date = new Date()): string {
  return date.toLocaleString(RESTAURANT_CONFIG.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}