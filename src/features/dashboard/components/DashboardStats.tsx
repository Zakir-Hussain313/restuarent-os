"use client";

import { TrendingUp, TrendingDown, ShoppingBag, Users, Receipt, DollarSign, LucideIcon } from "lucide-react";
import { StatCardSkeleton } from "@/components/data-display/LoadingSkeleton";
import { useDashboardStats } from "../hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats as DashboardStatsType } from "@/types/analytics";

interface StatConfig {
  label: string;
  icon: LucideIcon;
  getValue: (s: DashboardStatsType) => string;
  getTrend: (s: DashboardStatsType) => number;
  color: string;
  bg: string;
}



const STAT_CONFIG: StatConfig[] = [
  {
    label: "Monthly Revenue",
    icon: DollarSign,
    getValue: (s) => formatCurrency(s.totalRevenue),
    getTrend: (s) => s.revenueChange,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Total Orders",
    icon: ShoppingBag,
    getValue: (s) => String(s.totalOrders),
    getTrend: (s) => s.ordersChange,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Customers Served",
    icon: Users,
    getValue: (s) => String(s.totalCustomers),
    getTrend: (s) => s.customersChange,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Avg Order Value",
    icon: Receipt,
    getValue: (s) => formatCurrency(s.averageOrderValue),
    getTrend: (s) => s.aovChange,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
];

export function DashboardStats() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CONFIG.map(({ label, icon: Icon, getValue, getTrend, color, bg }) => {
        const trend = getTrend(stats);
        const isPositive = trend >= 0;

        return (
          <div
            key={label}
            className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
              <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>

            <div className="flex items-end justify-between gap-2">
              <span className="text-2xl font-heading font-bold text-foreground tracking-tight">
                {getValue(stats)}
              </span>
              <div className={`flex items-center gap-1 text-xs font-medium pb-0.5 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                {isPositive
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />
                }
                <span>{Math.abs(trend)}%</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">vs last month</p>
          </div>
        );
      })}
    </div>
  );
}




