import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBranchListAction } from "@/features/branches/actions";
import { AttendanceFilters } from "@/features/attendance/components/AttendanceFilters";
import { AttendanceTable } from "@/features/attendance/components/AttendanceTable";

export default async function AttendancePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentStaffRow = user
    ? await db.query.staff.findFirst({ where: eq(staff.id, user.id) })
    : null;

  const isSuperAdmin = currentStaffRow?.role === "SUPER_ADMIN";
  const isAdmin = currentStaffRow?.role === "ADMIN";

  // Only ADMIN and SUPER_ADMIN may access attendance at all.
  if (!currentStaffRow || (!isAdmin && !isSuperAdmin)) {
    redirect("/dashboard");
  }

  const { branches } = isSuperAdmin
    ? await getBranchListAction()
    : { branches: [] };

  return (
    <PageShell
      title="Attendance"
      description="Mark and review daily staff attendance."
    >
      <Suspense fallback={null}>
        <AttendanceFilters
          isSuperAdmin={isSuperAdmin}
          branches={branches ?? []}
        >
          <AttendanceTable />
        </AttendanceFilters>
      </Suspense>
    </PageShell>
  );
}