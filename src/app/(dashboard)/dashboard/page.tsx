import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBranchListAction } from "@/features/branches/actions";
import {
  DashboardStats,
  RevenueChart,
  RecentOrdersWidget,
  TopDishesWidget,
  OrderTypeBreakdownWidget,
  QuickActionsBar,
  ReservationStatsWidget,
} from "@/features/dashboard";
import { DashboardBranchFilter } from "@/features/dashboard/components/DashboardBranchFilter";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const currentStaffRow = user
    ? await db.query.staff.findFirst({ where: eq(staff.id, user.id) })
    : null;

  const isSuperAdmin = currentStaffRow?.role === "SUPER_ADMIN";

  const { branches } = isSuperAdmin
    ? await getBranchListAction()
    : { branches: [] };

  return (
    <PageShell
      title="Dashboard"
      description= {`Welcome back. Here's what's happening at ${RESTAURANT_CONFIG.name} today.`}
      actions={
        <div className="flex items-center gap-3">
          {isSuperAdmin && <DashboardBranchFilter branches={branches ?? []} />}
          <QuickActionsBar />
        </div>
      }
    >
      <Suspense fallback={null}>
        <div className="flex flex-col gap-6 min-w-0">
          <DashboardStats />

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3">
              <RevenueChart />
            </div>
            <div className="xl:col-span-2">
              <TopDishesWidget />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
            <div className="xl:col-span-3 flex flex-col xl:h-full">
              <RecentOrdersWidget />
            </div>
            <div className="xl:col-span-2 flex flex-col gap-6">
              <OrderTypeBreakdownWidget />
              <ReservationStatsWidget />
            </div>
          </div>
        </div>
      </Suspense>
    </PageShell>
  );
}