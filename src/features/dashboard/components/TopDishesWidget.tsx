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
    <div className="bg-card rounded-2xl border border-border flex flex-col h-86">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Top Dishes</h3>
          <p className="text-xs text-muted-foreground">By orders this month</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#f4f2ef]">
        {isLoading ? (
          <div className="p-5">
            <ChartSkeleton />
          </div>
        ) : (
          dishes?.map((dish, index) => {
            const pct = Math.round((dish.quantitySold / maxOrders) * 100);
            return (
              <div
                key={dish.menuItemId}
                className="px-5 py-3.5 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      RANK_COLORS[index] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {dish.name}
                      </span>
                      <span className="text-xs font-medium text-primary shrink-0">
                        {formatCurrency(dish.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
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