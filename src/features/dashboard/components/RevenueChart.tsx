"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartSkeleton } from "@/components/data-display/LoadingSkeleton";
import { useRevenueData } from "../hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";
import type { RevenueDataPoint } from "@/types/analytics";

type Range = "7d" | "30d" | "90d";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RevenueDataPoint }>;
}

const RANGES: { label: string; value: Range }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white border border-[#ebe9e4] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-[#8a8680] mb-1">
        {new Date(point.date).toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
      </p>
      <p className="text-sm font-semibold text-[#1a1815]">{formatCurrency(point.revenue)}</p>
      <p className="text-xs text-[#8a8680]">Orders: {point.orders}</p>
    </div>
  );
}

export function RevenueChart() {
  const [range, setRange] = useState<Range>("30d");
  const { data, isLoading } = useRevenueData(range);

  const totalRevenue = data?.reduce((sum: number, d: RevenueDataPoint) => sum + d.revenue, 0) ?? 0;

  return (
    <div className="bg-white rounded-xl border border-[#ebe9e4] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1815]">Revenue Overview</h3>
          {!isLoading && (
            <p className="text-xs text-[#8a8680] mt-0.5">
              Total: {formatCurrency(totalRevenue)}
            </p>
          )}
        </div>
        <div className="flex items-center bg-[#f9f8f6] rounded-lg p-0.5 border border-[#ebe9e4]">
          {RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                range === value
                  ? "bg-white text-[#e8570e] shadow-sm border border-[#ebe9e4]"
                  : "text-[#8a8680] hover:text-[#1a1815]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <div className="h-62">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e8570e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#e8570e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#8a8680" }}
                tickLine={false}
                axisLine={false}
                interval={range === "7d" ? 0 : range === "30d" ? 4 : 9}
                tickFormatter={(val: string) => {
                  const d = new Date(val);
                  return d.toLocaleDateString("en-PK", { month: "short", day: "numeric" });
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#8a8680" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#e8570e"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#e8570e", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}