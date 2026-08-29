// src/features/attendance/actions.ts
"use server";

import { db } from "@/db";
import { attendance, Attendance, staff, branchDevices, deliveries } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getSupabaseServerClient } from "@/lib/supabase";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { createNotification } from "@/features/notifications/actions";
import { and, eq, gte, lt, ne, sql } from "drizzle-orm";
import { RESTAURANT_CONFIG } from "@/lib/restaurantConfig";

function todayInTenantTz(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: RESTAURANT_CONFIG.timezone,
  });
}

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
  hasOpenSession: boolean;
  isDeleted: boolean;
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

  // Independent of the viewed date — an unclosed session from ANY previous
  // day must still surface an End Shift action, even when looking at a
  // date where that staff member has no attendance row at all yet.
  const openSessions = await db
    .select({ staffId: attendance.staffId })
    .from(attendance)
    .where(
      and(
        eq(attendance.tenantId, tenantId),
        sql`${attendance.checkIn} is not null`,
        sql`${attendance.checkOut} is null`
      )
    );
  const openSessionStaffIds = new Set(openSessions.map((r) => r.staffId));

  const liveRows: AttendanceRow[] = rows.map((r) => ({
    staffId: r.staffId,
    firstName: r.firstName,
    lastName: r.lastName,
    image: r.image,
    attendanceId: r.attendanceId,
    status: r.status,
    checkIn: r.checkIn ? r.checkIn.toISOString() : null,
    checkOut: r.checkOut ? r.checkOut.toISOString() : null,
    notes: r.notes,
    hasOpenSession: openSessionStaffIds.has(r.staffId),
    isDeleted: false,
  }));

  // Permanently-deleted staff have no `staff` row left, so they can't come
  // from the query above. Their attendance rows still exist though (staffId
  // set null on delete, staffName/staffIdSnapshot preserved) — pull those in
  // separately so deleted staff still show up in history. Note: role isn't
  // preserved on delete, so these rows show regardless of roleFilter.
  const deletedRows = await db
    .select({
      id: attendance.id,
      staffName: attendance.staffName,
      staffIdSnapshot: attendance.staffIdSnapshot,
      status: attendance.status,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      notes: attendance.notes,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.tenantId, tenantId),
        sql`${attendance.staffId} is null`,
        gte(attendance.date, start),
        lt(attendance.date, end),
        branchId ? eq(attendance.branchId, branchId) : undefined
      )
    );

  const deletedAttendanceRows: AttendanceRow[] = deletedRows.map((r) => {
    const [firstName, ...rest] = (r.staffName ?? "Deleted staff").split(" ");
    return {
      staffId: r.staffIdSnapshot ?? r.id,
      firstName,
      lastName: rest.join(" "),
      image: null,
      attendanceId: r.id,
      status: r.status,
      checkIn: r.checkIn ? r.checkIn.toISOString() : null,
      checkOut: r.checkOut ? r.checkOut.toISOString() : null,
      notes: r.notes,
      hasOpenSession: false,
      isDeleted: true,
    };
  });

  return { data: [...liveRows, ...deletedAttendanceRows] };
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
  const todayStr = todayInTenantTz();
  if (date !== todayStr) {
    return { error: "Attendance can only be marked for today's date." };
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
      // A staff member can have at most one truly open session (checkIn
      // set, checkOut null) at any time — enforced by the
      // attendance_one_open_session DB constraint. If it belongs to a
      // PREVIOUS day (not today's row), auto-close it at the end of that
      // day before opening today's session, instead of failing.
      if (status === "present") {
        const openFromPastDay = await tx.query.attendance.findFirst({
          where: and(
            eq(attendance.staffId, staffId),
            sql`${attendance.checkIn} is not null`,
            sql`${attendance.checkOut} is null`,
            lt(attendance.date, start)
          ),
        });
        if (openFromPastDay) {
          const endOfThatDay = new Date(openFromPastDay.date);
          endOfThatDay.setUTCHours(23, 59, 59, 999);
          await tx
            .update(attendance)
            .set({ checkOut: endOfThatDay, updatedAt: new Date() })
            .where(eq(attendance.id, openFromPastDay.id));
        }
      }

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
            checkIn: checkInDate ?? existing.checkIn,
            checkOut: checkOutDate ?? existing.checkOut,
            notes: notes ?? null,
            loggedBy: currentStaffRow.id,
            loggedByName: `${currentStaffRow.firstName} ${currentStaffRow.lastName}`,
            staffName: `${targetStaff.firstName} ${targetStaff.lastName}`,
            staffIdSnapshot: staffId,
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
            staffName: `${targetStaff.firstName} ${targetStaff.lastName}`,
            staffIdSnapshot: staffId,
            status,
            checkIn: checkInDate ?? null,
            checkOut: checkOutDate ?? null,
            date: start,
            notes: notes ?? null,
            loggedBy: currentStaffRow.id,
            loggedByName: `${currentStaffRow.firstName} ${currentStaffRow.lastName}`,
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

    await broadcastChange(targetStaff.branchId!, "attendance");

    return { success: true };
  } catch (err) {
    console.error("[markAttendanceAction] insert failed:", err);
    const pgError = err as { code?: string; cause?: { code?: string } };
    if (pgError.code === "23505" || pgError.cause?.code === "23505") {
      return { error: "This staff member has an unclosed shift from a previous day. End that shift first." };
    }
    return { error: `Failed to mark attendance: ${(err as Error).message}` };
  }
}

// Used by the offline coupon token-split design (Level 2) — cached
// client-side while online, read from cache once the connection drops
// since this action becomes unreachable at exactly the moment it's needed.
export async function getClockedInStaffCountAction(
  branchId: string
): Promise<{ data: number; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(currentStaffRow.role)) {
    return { data: null, error: "You don't have permission to view attendance." };
  }

  const todayStr = todayInTenantTz();
  const { start, end } = dayRange(todayStr);

  const rows = await db
    .select({ staffId: staff.id })
    .from(staff)
    .innerJoin(
      attendance,
      and(
        eq(attendance.staffId, staff.id),
        gte(attendance.date, start),
        lt(attendance.date, end)
      )
    )
    .where(
      and(
        eq(staff.tenantId, currentStaffRow.tenantId),
        eq(staff.branchId, branchId),
        eq(staff.isDeleted, false),
        eq(staff.role, "STAFF"), // only STAFF places POS orders / splits coupon tokens — no admins, no riders
        sql`${attendance.checkIn} is not null`,
        sql`${attendance.checkOut} is null`
      )
    );

  return { data: rows.length };
}


export async function endShiftAction(
  staffId: string
): Promise<{ success: true; error?: undefined } | { success?: undefined; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const [currentStaffRow, targetStaff] = await Promise.all([
    db.query.staff.findFirst({ where: eq(staff.id, user.id) }),
    db.query.staff.findFirst({ where: eq(staff.id, staffId) }),
  ]);

  if (!currentStaffRow) return { error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  const isSuperAdmin = currentStaffRow.role === "SUPER_ADMIN";
  if (!isAdmin && !isSuperAdmin) {
    return { error: "You don't have permission to end a shift." };
  }
  if (isAdmin && !currentStaffRow.branchId) {
    return { error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;

  if (!targetStaff || targetStaff.tenantId !== tenantId) {
    return { error: "Staff member not found." };
  }
  if (isAdmin && targetStaff.branchId !== currentStaffRow.branchId) {
    return { error: "You can only end shifts for your own branch." };
  }

  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.staffId, staffId),
      sql`${attendance.checkOut} is null`,
      sql`${attendance.checkIn} is not null`
    ),
  });

  if (!existing) {
    return { error: "This staff member is not currently clocked in." };
  }

  await db
    .update(attendance)
    .set({ checkOut: new Date(), updatedAt: new Date() })
    .where(eq(attendance.id, existing.id));

  await logAudit(db, currentStaffRow, "attendance", existing.id, "update", {
    newValue: { checkOut: "now" },
    description: `Ended shift for ${targetStaff.firstName} ${targetStaff.lastName}`,
  });

  if (targetStaff.branchId) {
    await broadcastChange(targetStaff.branchId, "attendance");
    await createNotification({
      tenantId,
      branchId: targetStaff.branchId,
      type: "staff_shift",
      title: "Shift ended",
      message: `${targetStaff.firstName} ${targetStaff.lastName}'s shift was ended.`,
      resourceType: "attendance",
      resourceId: existing.id,
    });
  }

  return { success: true };
}

// ── Self-service clock in/out (STAFF/RIDER, from an approved branch device) ──

export async function clockInAction(
  deviceToken: string
): Promise<{ success: true; error?: undefined } | { success?: undefined; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!["STAFF", "RIDER"].includes(currentStaffRow.role)) {
    return { error: "Only staff and riders can clock in." };
  }
  if (!currentStaffRow.branchId) return { error: "Your account has no branch assigned." };

  let device = await db.query.branchDevices.findFirst({
    where: and(
      eq(branchDevices.branchId, currentStaffRow.branchId),
      eq(branchDevices.deviceToken, deviceToken)
    ),
  });

  if (!device) {
    const [created] = await db
      .insert(branchDevices)
      .values({
        tenantId: currentStaffRow.tenantId,
        branchId: currentStaffRow.branchId,
        deviceToken,
        requestedBy: currentStaffRow.id,
      })
      .returning();
    device = created;

    await createNotification({
      tenantId: currentStaffRow.tenantId,
      branchId: currentStaffRow.branchId,
      type: "device_pending_approval",
      title: "Device approval needed",
      message: `${currentStaffRow.firstName} ${currentStaffRow.lastName} wants to clock in from a new device.`,
      resourceType: "branch_device",
      resourceId: device.id,
    });
  }

  if (device.status !== "approved") {
    return { error: "This device isn't approved for clock-in yet. Ask your admin to approve it." };
  }

  const todayStr = todayInTenantTz();
  const { start, end } = dayRange(todayStr);
  const tenantId = currentStaffRow.tenantId;
  const branchId = currentStaffRow.branchId;

  const alreadyOpen = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.staffId, currentStaffRow.id),
      sql`${attendance.checkIn} is not null`,
      sql`${attendance.checkOut} is null`
    ),
  });
  if (alreadyOpen) {
    return { error: "You're already clocked in." };
  }

  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.staffId, currentStaffRow.id),
      gte(attendance.date, start),
      lt(attendance.date, end)
    ),
  });

  let attendanceId: string;

  const selfName = `${currentStaffRow.firstName} ${currentStaffRow.lastName}`;

  if (existing) {
    await db
      .update(attendance)
      .set({
        status: "present",
        checkIn: new Date(),
        checkOut: null,
        staffName: selfName,
        staffIdSnapshot: currentStaffRow.id,
        loggedBy: currentStaffRow.id,
        loggedByName: selfName,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, existing.id));
    attendanceId = existing.id;
  } else {
    const [created] = await db
      .insert(attendance)
      .values({
        tenantId,
        branchId,
        staffId: currentStaffRow.id,
        staffName: selfName,
        staffIdSnapshot: currentStaffRow.id,
        status: "present",
        checkIn: new Date(),
        date: start,
        loggedBy: currentStaffRow.id,
        loggedByName: selfName,
      })
      .returning();
    attendanceId = created.id;
  }

  if (currentStaffRow.role === "RIDER") {
    await db.update(staff).set({ isAvailable: true, updatedAt: new Date() }).where(eq(staff.id, currentStaffRow.id));
  }

  if (currentStaffRow.role === "RIDER") {
    await db.update(staff).set({ isAvailable: true, updatedAt: new Date() }).where(eq(staff.id, currentStaffRow.id));
  }

  await logAudit(db, currentStaffRow, "attendance", attendanceId, "update", {
    newValue: { checkIn: "now" },
    description: `${currentStaffRow.firstName} ${currentStaffRow.lastName} clocked in`,
  });

  await broadcastChange(branchId, "attendance");
  await createNotification({
    tenantId,
    branchId,
    type: "staff_shift",
    title: "Staff clocked in",
    message: `${currentStaffRow.firstName} ${currentStaffRow.lastName} clocked in.`,
    resourceType: "attendance",
    resourceId: attendanceId,
  });

  return { success: true };
}

export async function clockOutAction(): Promise <
  { success: true; error?: undefined } | { success?: undefined; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!["STAFF", "RIDER"].includes(currentStaffRow.role)) {
    return { error: "Only staff and riders can clock out." };
  }

  if (currentStaffRow.role === "RIDER") {
    const activeDelivery = await db.query.deliveries.findFirst({
      where: and(
        eq(deliveries.riderId, currentStaffRow.id),
        sql`${deliveries.status} in ('assigned', 'out_for_delivery')`
      ),
    });
    if (activeDelivery) {
      return { error: "Finish or hand off your current delivery before clocking out." };
    }
  }

  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.staffId, currentStaffRow.id),
      sql`${attendance.checkIn} is not null`,
      sql`${attendance.checkOut} is null`
    ),
  });
  if (!existing) {
    return { error: "You're not currently clocked in." };
  }

  await db
    .update(attendance)
    .set({ checkOut: new Date(), updatedAt: new Date() })
    .where(eq(attendance.id, existing.id));

  if (currentStaffRow.role === "RIDER") {
    await db.update(staff).set({ isAvailable: false, updatedAt: new Date() }).where(eq(staff.id, currentStaffRow.id));
  }

  await logAudit(db, currentStaffRow, "attendance", existing.id, "update", {
    newValue: { checkOut: "now" },
    description: `${currentStaffRow.firstName} ${currentStaffRow.lastName} clocked out`,
  });

  if (currentStaffRow.branchId) {
    await broadcastChange(currentStaffRow.branchId, "attendance");
    await createNotification({
      tenantId: currentStaffRow.tenantId,
      branchId: currentStaffRow.branchId,
      type: "staff_shift",
      title: "Staff clocked out",
      message: `${currentStaffRow.firstName} ${currentStaffRow.lastName} clocked out.`,
      resourceType: "attendance",
      resourceId: existing.id,
    });
  }

  return { success: true };
}

export async function getMyClockStatusAction(): Promise <
  { isClockedIn: boolean; error?: undefined } | { isClockedIn?: undefined; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const open = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.staffId, user.id),
      sql`${attendance.checkIn} is not null`,
      sql`${attendance.checkOut} is null`
    ),
  });

  return { isClockedIn: !!open };
}