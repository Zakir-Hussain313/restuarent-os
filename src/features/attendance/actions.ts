// src/features/attendance/actions.ts
"use server";

import { db } from "@/db";
import { attendance, Attendance, staff } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getSupabaseServerClient } from "@/lib/supabase";
import { and, eq, gte, lt, ne } from "drizzle-orm";

function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export interface AttendanceRow {
  staffId: string;
  firstName: string;
  lastName: string;
  image: string | null;
  attendanceId: string | null;
  status: Attendance["status"] | null;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
}

// Update getAttendanceForDateAction signature and query

export async function getAttendanceForDateAction(
  date: string,
  overrideBranchId?: string,
  roleFilter?: "ADMIN" | "STAFF" | "RIDER"
): Promise<{ data: AttendanceRow[]; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  const isSuperAdmin = currentStaffRow.role === "SUPER_ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;
  // roleFilter is only meaningful for SUPER_ADMIN — ADMIN never sees other admins anyway.
  const effectiveRoleFilter = isSuperAdmin ? roleFilter : undefined;

  const { start, end } = dayRange(date);

  const rows = await db
    .select({
      staffId: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      image: staff.image,
      attendanceId: attendance.id,
      status: attendance.status,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      notes: attendance.notes,
    })
    .from(staff)
    .leftJoin(
      attendance,
      and(
        eq(attendance.staffId, staff.id),
        gte(attendance.date, start),
        lt(attendance.date, end)
      )
    )
    .where(
      and(
        eq(staff.tenantId, tenantId),
        eq(staff.isDeleted, false),
        ne(staff.role, "SUPER_ADMIN"), // never tracked
        ne(staff.id, currentStaffRow.id), // viewer never sees themselves
        branchId ? eq(staff.branchId, branchId) : undefined,
        effectiveRoleFilter ? eq(staff.role, effectiveRoleFilter) : undefined
      )
    );

  const data: AttendanceRow[] = rows.map((r) => ({
    staffId: r.staffId,
    firstName: r.firstName,
    lastName: r.lastName,
    image: r.image,
    attendanceId: r.attendanceId,
    status: r.status,
    checkIn: r.checkIn ? r.checkIn.toISOString() : null,
    checkOut: r.checkOut ? r.checkOut.toISOString() : null,
    notes: r.notes,
  }));

  return { data };
}

export async function markAttendanceAction(
  staffId: string,
  date: string,
  status: Attendance["status"],
  checkIn?: string,
  checkOut?: string,
  notes?: string
): Promise<{ success: true; error?: undefined } | { success?: undefined; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Auth check and target-staff lookup don't depend on each other —
  // run them concurrently instead of one after another. Each round trip
  // to Tokyo costs real latency from Quetta, so cutting sequential trips
  // matters more here than it would for a co-located DB.
  const [currentStaffRow, targetStaff] = await Promise.all([
    db.query.staff.findFirst({ where: eq(staff.id, user.id) }),
    db.query.staff.findFirst({ where: eq(staff.id, staffId) }),
  ]);

  if (!currentStaffRow) return { error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  const isSuperAdmin = currentStaffRow.role === "SUPER_ADMIN";
  if (!isAdmin && !isSuperAdmin) {
    return { error: "You don't have permission to mark attendance." };
  }
  if (isAdmin && !currentStaffRow.branchId) {
    return { error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;

  if (!targetStaff || targetStaff.tenantId !== tenantId) {
    return { error: "Staff member not found." };
  }
  if (isAdmin && targetStaff.branchId !== currentStaffRow.branchId) {
    return { error: "You can only mark attendance for your own branch." };
  }

  const { start, end } = dayRange(date);
  const checkInDate = checkIn ? new Date(checkIn) : null;
  const checkOutDate = checkOut ? new Date(checkOut) : null;

  try {
    let auditInfo: { id: string; isNew: boolean; oldStatus?: string };

    await db.transaction(async (tx) => {
      const existing = await tx.query.attendance.findFirst({
        where: and(
          eq(attendance.staffId, staffId),
          gte(attendance.date, start),
          lt(attendance.date, end)
        ),
      });

      if (existing) {
        await tx
          .update(attendance)
          .set({
            status,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            notes: notes ?? null,
            loggedBy: currentStaffRow.id,
            updatedAt: new Date(),
          })
          .where(eq(attendance.id, existing.id));

        auditInfo = { id: existing.id, isNew: false, oldStatus: existing.status };
      } else {
        const [created] = await tx
          .insert(attendance)
          .values({
            tenantId,
            branchId: targetStaff.branchId!,
            staffId,
            status,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            date: start,
            notes: notes ?? null,
            loggedBy: currentStaffRow.id,
          })
          .returning();

        auditInfo = { id: created.id, isNew: true };
      }
    });

    if (auditInfo!.isNew) {
      await logAudit(db, currentStaffRow, "attendance", auditInfo!.id, "create", {
        newValue: { status },
        description: `Marked attendance for ${targetStaff.firstName} ${targetStaff.lastName} (${date})`,
      });
    } else {
      await logAudit(db, currentStaffRow, "attendance", auditInfo!.id, "update", {
        oldValue: { status: auditInfo!.oldStatus },
        newValue: { status },
        description: `Updated attendance for ${targetStaff.firstName} ${targetStaff.lastName} (${date})`,
      });
    }

    return { success: true };
  } catch (err) {
    return { error: `Failed to mark attendance: ${(err as Error).message}` };
  }
}