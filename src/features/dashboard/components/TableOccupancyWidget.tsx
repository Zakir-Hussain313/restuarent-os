"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { useTableOccupancy } from "../hooks/useDashboardData";
import { TableStatus } from "@/types/table";

const STATUS_STYLES: Record<TableStatus, { bg: string; border: string; dot: string; label: string }> = {
  available: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    label: "Available",
  },
  occupied: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-[#e8570e]",
    label: "Occupied",
  },
  reserved: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    label: "Reserved",
  },
  cleaning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
    label: "Cleaning",
  },
  inactive: {
    bg: "bg-[#f4f2ef]",
    border: "border-[#ebe9e4]",
    dot: "bg-[#8a8680]",
    label: "Inactive",
  },
};

export function TableOccupancyWidget() {
  const { data: tables, isLoading } = useTableOccupancy();

  const counts = tables?.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TableStatus, number>
  );

  const occupiedCount = counts?.occupied ?? 0;
  const totalCount = tables?.length ?? 0;
  const occupancyPct = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-[#ebe9e4] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebe9e4]">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1815]">Table Status</h3>
          <p className="text-xs text-[#8a8680] mt-0.5">
            {occupiedCount}/{totalCount} tables occupied · {occupancyPct}%
          </p>
        </div>
        <Link
          href="/tables"
          className="flex items-center gap-1 text-xs font-medium text-[#e8570e] hover:text-[#c44a0c] transition-colors"
        >
          Manage
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#f4f2ef]">
        {Object.entries(STATUS_STYLES).map(([status, style]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className="text-xs text-[#8a8680]">
              {style.label} ({counts?.[status as TableStatus] ?? 0})
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="p-5">
        {isLoading ? (
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-[#f4f2ef] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {tables?.map((table) => {
              const style = STATUS_STYLES[table.status];
              return (
                <div
                  key={table.id}
                  title={`Table ${table.tableNumber} — ${style.label}${table.currentOrderId ? " · Has order" : ""}`}
                  className={`relative flex flex-col items-center justify-center h-12 rounded-lg border ${style.bg} ${style.border} cursor-default transition-all hover:scale-105`}
                >
                  <span className="text-xs font-bold text-[#1a1815]">{table.tableNumber}</span>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Users className="w-2.5 h-2.5 text-[#8a8680]" />
                    <span className="text-[10px] text-[#8a8680]">{table.capacity}</span>
                  </div>
                  {table.status === "occupied" && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#e8570e] animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}