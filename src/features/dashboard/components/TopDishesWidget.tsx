"use client";

import { Trophy } from "lucide-react";
import { ChartSkeleton } from "@/components/data-display/LoadingSkeleton";
import { useTopDishes } from "../hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";

const RANK_COLORS = [
  "bg-amber-400 text-white",
  "bg-slate-400 text-white",
  "bg-orange-700 text-white",
];

export function TopDishesWidget() {
  const { data: dishes, isLoading } = useTopDishes();

  const maxOrders = dishes?.[0]?.quantitySold ?? 1;

  return (
    <div className="bg-white rounded-xl border border-[#ebe9e4] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#ebe9e4]">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1a1815]">Top Dishes</h3>
          <p className="text-xs text-[#8a8680]">By orders this month</p>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-[#f4f2ef]">
        {isLoading ? (
          <div className="p-5">
            <ChartSkeleton />
          </div>
        ) : (
          dishes?.map((dish, index) => {
            const pct = Math.round((dish.quantitySold / maxOrders) * 100);
            return (
              <div key={dish.menuItemId} className="px-5 py-3.5 hover:bg-[#faf9f7] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  {/* Rank badge */}
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      RANK_COLORS[index] ?? "bg-[#f0ede8] text-[#8a8680]"
                    }`}
                  >
                    {index + 1}
                  </span>

                  {/* Name + revenue */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#1a1815] truncate">
                        {dish.name}
                      </span>
                      <span className="text-xs font-medium text-[#e8570e] shrink-0">
                        {formatCurrency(dish.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Progress bar */}
                      <div className="flex-1 h-1.5 bg-[#f0ede8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#e8570e] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#8a8680] shrink-0">
                        {dish.quantitySold} orders
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}