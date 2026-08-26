"use client";

import { useMemo } from "react";
import { UtensilsCrossed, ShoppingBag, Bike, LayoutGrid } from "lucide-react";
import { ChartSkeleton } from "@/components/data-display/LoadingSkeleton";
import { formatCurrency } from "@/lib/utils";
import type { OrderTypeBreakdown } from "@/types";

interface OrderTypeConfig {
  label: string;
  icon: React.ElementType;
  barColor: string;
  iconBg: string;
  iconColor: string;
  svgColor: string;
}

const ORDER_TYPE_CONFIG: Record<string, OrderTypeConfig> = {
  "Dine-in": { label: "Dine-in", icon: UtensilsCrossed, barColor: "#5B21B6", iconBg: "bg-primary-light", iconColor: "text-primary", svgColor: "#5B21B6" },
  "Takeaway": { label: "Takeaway", icon: ShoppingBag, barColor: "#3b82f6", iconBg: "bg-blue-50", iconColor: "text-blue-500", svgColor: "#3b82f6" },
  "Delivery": { label: "Delivery", icon: Bike, barColor: "#10b981", iconBg: "bg-emerald-50", iconColor: "text-emerald-500", svgColor: "#10b981" },
};

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_PCT = (2 / 360) * 100;

interface DonutSlice { percentage: number; color: string; rotation: number; dashArray: string; }

function buildDonutSlices(breakdown: OrderTypeBreakdown[]): DonutSlice[] {
  let cumulative = 0;
  return breakdown.map((item) => {
    const config = ORDER_TYPE_CONFIG[item.orderType];
    const slicePct = Math.max(0, item.percentage - GAP_PCT);
    const dashArray = `${(slicePct / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    const rotation = -90 + (cumulative / 100) * 360;
    cumulative += item.percentage;
    return { percentage: item.percentage, color: config?.svgColor ?? "#e0dcd7", rotation, dashArray };
  });
}

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="#f0ede8" strokeWidth="10" />
      {slices.map((slice, i) => (
        <circle
          key={i} cx="44" cy="44" r={RADIUS} fill="none"
          stroke={slice.color} strokeWidth="10"
          strokeDasharray={slice.dashArray} strokeDashoffset="0"
          strokeLinecap="butt"
          transform={`rotate(${slice.rotation} 44 44)`}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      ))}
    </svg>
  );
}

interface OrderTypeBreakdownWidgetProps {
  breakdown: OrderTypeBreakdown[] | undefined;
  isLoading: boolean;
}

export function OrderTypeBreakdownWidget({ breakdown, isLoading }: OrderTypeBreakdownWidgetProps) {
  const totalOrders = useMemo(() => breakdown?.reduce((s: number, b: OrderTypeBreakdown) => s + b.count, 0) ?? 0, [breakdown]);
  const totalRevenue = useMemo(() => breakdown?.reduce((s: number, b: OrderTypeBreakdown) => s + b.revenue, 0) ?? 0, [breakdown]);
  const donutSlices = useMemo(() => (breakdown ? buildDonutSlices(breakdown) : []), [breakdown]);

  return (
    <div className="bg-card rounded-2xl border border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center">
          <LayoutGrid className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Order Types</h3>
        </div>
      </div>

      {isLoading ? (
        <div className="p-5"><ChartSkeleton /></div>
      ) : (
        <>
          {/* Donut + totals */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
            <DonutChart slices={donutSlices} />
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="text-2xl font-heading font-bold text-foreground leading-none">{totalOrders.toLocaleString()}</span> - 
                <span className="text-xs text-muted-foreground">Total orders</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">{formatCurrency(totalRevenue)}</span> -
                <span className="text-xs text-muted-foreground">Total revenue</span>
              </span>
            </div>
          </div>

          {/* Type rows */}
          <div className="flex flex-col divide-y divide-border">
            {breakdown?.map((item: OrderTypeBreakdown) => {
              const config = ORDER_TYPE_CONFIG[item.orderType];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={item.orderType} className="px-5 py-2.5 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 ">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
                      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{config.label}</span>
                        <span className="text-xs font-semibold text-foreground shrink-0">{item.count} orders</span>
                      </div>
                      <div className="flex items-center gap-2 ">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: config.barColor }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 w-9 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="pl-10">
                    <span className="text-xs text-muted-foreground">{formatCurrency(item.revenue)} revenue</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}