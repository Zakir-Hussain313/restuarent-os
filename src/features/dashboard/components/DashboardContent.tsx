"use client";

import dynamic from "next/dynamic";
import { useDashboardBundle } from "../hooks/useDashboardData";
import { DashboardStats } from "./DashboardStats";
import { TopDishesWidget } from "./TopDishesWidget";
import { RecentOrdersWidget } from "./RecentOrdersWidget";
import { OrderTypeBreakdownWidget } from "./OrderTypeBreakdownWidget";
import { ReservationStatsWidget } from "./ReservationStatsWidget";

const RevenueChart = dynamic(
  () => import("./RevenueChart").then((mod) => mod.RevenueChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" /> }
);

export function DashboardContent() {
  const { data: bundle, isLoading } = useDashboardBundle();

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <DashboardStats stats={bundle?.stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <RevenueChart />
        </div>
        <div className="xl:col-span-2">
          <TopDishesWidget dishes={bundle?.topDishes} isLoading={isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
        <div className="xl:col-span-3 flex flex-col xl:h-full">
          <RecentOrdersWidget orders={bundle?.recentOrders} isLoading={isLoading} />
        </div>
        <div className="xl:col-span-2 flex flex-col gap-6">
          <OrderTypeBreakdownWidget breakdown={bundle?.orderTypeBreakdown} isLoading={isLoading} />
          <ReservationStatsWidget stats={bundle?.reservationStats} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}