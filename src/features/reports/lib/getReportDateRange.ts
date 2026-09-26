export type ReportPeriod =
  | "today"
  | "yesterday"
  | "week"
  | "last_week"
  | "month"
  | "last_month"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "last_6_months"
  | "year"
  | "last_year"
  | "custom";

export const ALL_REPORT_PERIODS: ReportPeriod[] = [
  "today", "yesterday", "week", "last_week", "month", "last_month",
  "last_7_days", "last_30_days", "last_90_days", "last_6_months", "year", "last_year", "custom",
];

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This Week",
  last_week: "Last Week",
  month: "This Month",
  last_month: "Last Month",
  last_7_days: "Last 7 Days",
  last_30_days: "Last 30 Days",
  last_90_days: "Last 90 Days",
  last_6_months: "Last 6 Months",
  year: "This Year",
  last_year: "Last Year",
  custom: "Custom Range",
};

export const PERIOD_GROUPS: { label: string; periods: ReportPeriod[] }[] = [
  { label: "Day", periods: ["today", "yesterday"] },
  { label: "Week", periods: ["week", "last_week"] },
  { label: "Month", periods: ["month", "last_month"] },
  { label: "Rolling", periods: ["last_7_days", "last_30_days", "last_90_days", "last_6_months"] },
  { label: "Year", periods: ["year", "last_year"] },
];

export interface ReportDateRange {
  start: Date;
  end: Date;
}

// All boundaries computed in UTC, consistent with dayRange() in
// src/features/attendance/dateUtils.ts (same known UTC-vs-local-midnight
// quirk applies here — flagged, not fixed, per existing file convention).
export function getReportDateRange(
  period: ReportPeriod,
  searchParams?: Record<string, string | string[] | undefined>
): ReportDateRange {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  switch (period) {
    case "today":
      return { start: todayStart, end: tomorrowStart };

    case "yesterday": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 1);
      return { start, end: todayStart };
    }

    case "week": {
      const dayOfWeek = todayStart.getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - daysSinceMonday);
      return { start, end: tomorrowStart };
    }

    case "last_week": {
      const dayOfWeek = todayStart.getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const thisWeekStart = new Date(todayStart);
      thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - daysSinceMonday);
      const start = new Date(thisWeekStart);
      start.setUTCDate(start.getUTCDate() - 7);
      return { start, end: thisWeekStart };
    }

    case "month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start, end: tomorrowStart };
    }

    case "last_month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start, end };
    }

    case "last_7_days": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 6);
      return { start, end: tomorrowStart };
    }

    case "last_30_days": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 29);
      return { start, end: tomorrowStart };
    }

    case "last_90_days": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 89);
      return { start, end: tomorrowStart };
    }

    case "last_6_months": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()));
      return { start, end: tomorrowStart };
    }

    case "year": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { start, end: tomorrowStart };
    }

    case "last_year": {
      const start = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { start, end };
    }

    case "custom": {
      const startParam = searchParams?.start;
      const endParam = searchParams?.end;
      if (typeof startParam === "string" && typeof endParam === "string") {
        const start = new Date(`${startParam}T00:00:00.000Z`);
        const end = new Date(`${endParam}T00:00:00.000Z`);
        end.setUTCDate(end.getUTCDate() + 1); // end date is inclusive
        return { start, end };
      }
      // Fallback if "custom" is requested without valid dates yet.
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start, end: tomorrowStart };
    }
  }
}