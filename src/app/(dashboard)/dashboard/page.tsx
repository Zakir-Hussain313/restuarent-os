import { PageShell } from "@/components/layout/PageShell";
import {
  DashboardStats,
  RevenueChart,
  RecentOrdersWidget,
  TopDishesWidget,
  TableOccupancyWidget,
  OrderTypeBreakdownWidget,
  QuickActionsBar,
} from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Welcome back. Here's what's happening at Rice n Spice today."
      actions={<QuickActionsBar />}
    >
      <div className="flex flex-col gap-6 min-w-0">
        {/* KPI Row */}
        <DashboardStats />

        {/* Row 2: Revenue (col-3) + Top Dishes (col-2) — equal height */}
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3">
            <RevenueChart />
          </div>
          <div className="col-span-2">
            <TopDishesWidget />
          </div>
        </div>

        {/* Row 3: Recent Orders (col-3) + right stack (col-2) — right column drives height */}
        <div className="grid grid-cols-5 gap-6 items-stretch">
          <div className="col-span-3 flex flex-col h-full">
            <RecentOrdersWidget />
          </div>
          <div className="col-span-2 flex flex-col gap-6">
            <OrderTypeBreakdownWidget />
            <TableOccupancyWidget />
          </div>
        </div>
      </div>
    </PageShell>
  );
}