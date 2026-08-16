export type ReportPeriod = "today" | "week" | "month" | "last_month";

export interface ReportDateRange {
  start: Date;
  end: Date;
}

// All boundaries computed in UTC, consistent with dayRange() in
// src/features/attendance/actions.ts (same known UTC-vs-local-midnight
// quirk applies here — flagged, not fixed, per existing file convention).
export function getReportDateRange(period: ReportPeriod): ReportDateRange {
  const now = new Date();
  const todayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));

  switch (period) {
    case "today": {
      const end = new Date(todayStart);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start: todayStart, end };
    }

    case "week": {
      // Monday-start week
      const dayOfWeek = todayStart.getUTCDay(); // 0=Sun..6=Sat
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - daysSinceMonday);
      const end = new Date(todayStart);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end };
    }

    case "month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(todayStart);
      end.setUTCDate(end.getUTCDate() + 1);
      return { start, end };
    }

    case "last_month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start, end };
    }
  }
}