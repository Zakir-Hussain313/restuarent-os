import { db } from "@/db";
import { attendance, staff } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export interface StaffAttendanceSummary {
  staffId: string;
  name: string;
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
  const rows = await db
    .select({
      staffId: attendance.staffId,
      firstName: sql<string>`max(${staff.firstName})`,
      lastName: sql<string>`max(${staff.lastName})`,
      present: sql<number>`count(*) filter (where ${attendance.status} = 'present')`,
      absent: sql<number>`count(*) filter (where ${attendance.status} = 'absent')`,
      late: sql<number>`count(*) filter (where ${attendance.status} = 'late')`,
      leave: sql<number>`count(*) filter (where ${attendance.status} = 'leave')`,
      halfDay: sql<number>`count(*) filter (where ${attendance.status} = 'half_day')`,
    })
    .from(attendance)
    .innerJoin(staff, eq(attendance.staffId, staff.id))
    .where(
      and(
        eq(attendance.tenantId, tenantId),
        eq(attendance.branchId, branchId),
        gte(attendance.date, start),
        lt(attendance.date, end)
      )
    )
    .groupBy(attendance.staffId)
    .orderBy(sql`max(${staff.firstName})`);

  return rows.map((r) => ({
    staffId: r.staffId,
    name: `${r.firstName} ${r.lastName}`,
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