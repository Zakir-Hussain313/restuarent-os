import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBranchListAction } from "@/features/branches/actions";
import { QuickActionsBar } from "@/features/dashboard";
import { DashboardContent } from "@/features/dashboard/components/DashboardContent";
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
        <DashboardContent />
      </Suspense>
    </PageShell>
  );
}