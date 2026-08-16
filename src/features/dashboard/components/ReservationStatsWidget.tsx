"use client";

import { CalendarCheck, TrendingUp, TrendingDown } from "lucide-react";
import { useReservationStats } from "../hooks/useDashboardData";

const STATUS_STYLES: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-[#e8a13d]" },
  confirmed: { label: "Confirmed", dot: "bg-[#3d9a5c]" },
  seated: { label: "Seated", dot: "bg-[#3d7ee8]" },
  cancelled: { label: "Cancelled", dot: "bg-[#c94f4f]" },
  no_show: { label: "No-show", dot: "bg-[#8a8680]" },
};

export function ReservationStatsWidget() {
  const { data: stats, isLoading } = useReservationStats();

  const isPositive = (stats?.reservationsChange ?? 0) >= 0;

  return (
    <div className="bg-white rounded-xl border border-[#ebe9e4] flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#ebe9e4] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1a1815]">Reservations</h3>
        <CalendarCheck className="w-4 h-4 text-[#8a8680]" />
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-24 rounded bg-[#f4f2ef] animate-pulse" />
            <div className="h-4 w-32 rounded bg-[#f4f2ef] animate-pulse" />
          </div>
        ) : (
          <>
            {/* Total + change */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#1a1815]">
                {stats?.totalReservations ?? 0}
              </span>
              <span className="text-xs text-[#8a8680]">this month</span>
            </div>

            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-[#3d9a5c]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#c94f4f]" />
              )}
              <span
                className={`text-xs font-medium ${
                  isPositive ? "text-[#3d9a5c]" : "text-[#c94f4f]"
                }`}
              >
                {isPositive ? "+" : ""}
                {stats?.reservationsChange ?? 0}%
              </span>
              <span className="text-xs text-[#8a8680]">vs last month</span>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-4 pt-4 border-t border-[#f4f2ef]">
              {stats?.statusBreakdown.map((s) => {
                const style = STATUS_STYLES[s.status] ?? {
                  label: s.status,
                  dot: "bg-[#8a8680]",
                };
                return (
                  <div key={s.status} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="text-[11px] text-[#8a8680]">
                      {style.label} ({s.count})
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}