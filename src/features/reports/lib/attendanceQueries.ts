import { db } from "@/db";
import { attendance, staff } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export interface StaffAttendanceSummary {
  staffId: string | null;
  name: string;
  isDeleted: boolean;
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfDay: number;
}

export interface AttendanceSummaryTotals {
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfDay: number;
}

export async function getStaffAttendanceBreakdown(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<StaffAttendanceSummary[]> {
  // leftJoin (not innerJoin) — a deleted staff member has no `staff` row
  // left, but their attendance rows (with staffName/staffIdSnapshot
  // preserved) must still surface in reports rather than silently vanishing.
  const rows = await db
    .select({
      staffId: attendance.staffId,
      staffIdSnapshot: attendance.staffIdSnapshot,
      snapshotName: attendance.staffName,
      firstName: sql<string | null>`max(${staff.firstName})`,
      lastName: sql<string | null>`max(${staff.lastName})`,
      present: sql<number>`count(*) filter (where ${attendance.status} = 'present')`,
      absent: sql<number>`count(*) filter (where ${attendance.status} = 'absent')`,
      late: sql<number>`count(*) filter (where ${attendance.status} = 'late')`,
      leave: sql<number>`count(*) filter (where ${attendance.status} = 'leave')`,
      halfDay: sql<number>`count(*) filter (where ${attendance.status} = 'half_day')`,
    })
    .from(attendance)
    .leftJoin(staff, eq(attendance.staffId, staff.id))
    .where(
      and(
        eq(attendance.tenantId, tenantId),
        eq(attendance.branchId, branchId),
        gte(attendance.date, start),
        lt(attendance.date, end)
      )
    )
    // Group by staffIdSnapshot too — multiple deleted staff all have
    // attendance.staffId = null, so grouping by staffId alone would
    // collapse them into one row.
    .groupBy(attendance.staffId, attendance.staffIdSnapshot, attendance.staffName)
    .orderBy(sql`max(coalesce(${staff.firstName}, ${attendance.staffName}))`);

  return rows.map((r) => ({
    staffId: r.staffId ?? r.staffIdSnapshot,
    name: r.staffId ? `${r.firstName} ${r.lastName}` : (r.snapshotName ?? "Deleted staff"),
    isDeleted: !r.staffId,
    present: Number(r.present),
    absent: Number(r.absent),
    late: Number(r.late),
    leave: Number(r.leave),
    halfDay: Number(r.halfDay),
  }));
}

export function getAttendanceTotals(rows: StaffAttendanceSummary[]): AttendanceSummaryTotals {
  return rows.reduce(
    (acc, r) => ({
      present: acc.present + r.present,
      absent: acc.absent + r.absent,
      late: acc.late + r.late,
      leave: acc.leave + r.leave,
      halfDay: acc.halfDay + r.halfDay,
    }),
    { present: 0, absent: 0, late: 0, leave: 0, halfDay: 0 }
  );
}