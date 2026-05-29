import { PageShell } from "@/components/layout/PageShell";
import {
  DashboardStats,
  RevenueChart,
  RecentOrdersWidget,
  TopDishesWidget,
  TableOccupancyWidget,
  QuickActionsBar,
} from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      description="Welcome back. Here's what's happening at Rice n Spice today."
      actions={<QuickActionsBar />}
    >
      <div className="flex flex-col gap-6">
        {/* KPI Row */}
        <DashboardStats />

        {/* Revenue + Top Dishes */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <RevenueChart />
          </div>
          <div className="lg:col-span-2">
            <TopDishesWidget />
          </div>
        </div>

        {/* Recent Orders + Table Occupancy */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <RecentOrdersWidget />
          </div>
          <div className="lg:col-span-2">
            <TableOccupancyWidget />
          </div>
        </div>
      </div>
    </PageShell>
  );
}