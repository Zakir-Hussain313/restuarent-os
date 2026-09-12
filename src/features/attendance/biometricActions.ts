// src/features/attendance/biometricActions.ts
"use server";

import crypto from "crypto";
import { db } from "@/db";
import {
  attendance,
  auditLogs,
  staff,
  branchDevices,
  staffBiometricEnrollments,
} from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getSupabaseServerClient } from "@/lib/supabase";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { createNotification } from "@/features/notifications/actions";
import { hasPermission } from "@/types/staff";
import { and, eq, inArray, sql } from "drizzle-orm";
import { todayInTenantTz, dayRange } from "./dateUtils";

// ─── Register a fingerprint scanner ────────────────────────────────────────
//
// Unlike the browser self-service flow (staff requests, admin approves),
// an admin registers the scanner themselves — so it's created already
// approved. Returns the generated sync secret ONCE; the caller must show
// it to the admin immediately (it's stored in deviceToken, same column
// the browser flow uses, but here it's server-generated, not client-sent).
export async function registerFingerprintScannerAction(
  label: string,
  overrideBranchId?: string
): Promise <
  { success: true; deviceId: string; syncSecret: string; error?: undefined } | { error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { error: "You don't have permission to register a scanner." };
  }

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { error: "Your account has no branch assigned." };
  }
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;
  if (!branchId) return { error: "A branch must be specified." };

  const syncSecret = crypto.randomBytes(32).toString("hex");

  const [created] = await db
    .insert(branchDevices)
    .values({
      tenantId: currentStaffRow.tenantId,
      branchId,
      deviceType: "fingerprint_scanner",
      deviceToken: syncSecret,
      label,
      status: "approved",
      requestedBy: currentStaffRow.id,
      approvedBy: currentStaffRow.id,
      approvedAt: new Date(),
    })
    .returning();

  await logAudit(db, currentStaffRow, "branch_device", created.id, "create", {
    newValue: { deviceType: "fingerprint_scanner", label },
    description: `${currentStaffRow.firstName} ${currentStaffRow.lastName} registered a fingerprint scanner`,
    branchId,
  });

  return { success: true, deviceId: created.id, syncSecret };
}

// ─── Enroll a staff member's fingerprint ───────────────────────────────────
//
// The fingerprint itself is enrolled physically on the scanner (staff
// presses finger, scanner assigns it an ID). This just maps that ID to
// a staff record in Zaiqa — admin reads the ID off the scanner's own
// screen/software and enters it here.
export async function enrollStaffBiometricAction(
  staffId: string,
  branchDeviceId: string,
  externalUserId: string
): Promise<{ success: true; error?: undefined } | { error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { error: "You don't have permission to enroll fingerprints." };
  }

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, branchDeviceId) });
  if (!device || device.tenantId !== currentStaffRow.tenantId || device.deviceType !== "fingerprint_scanner") {
    return { error: "Scanner not found." };
  }
  if (currentStaffRow.role === "ADMIN" && device.branchId !== currentStaffRow.branchId) {
    return { error: "You can only enroll staff for your own branch's scanner." };
  }

  const targetStaff = await db.query.staff.findFirst({ where: eq(staff.id, staffId) });
  if (!targetStaff || targetStaff.tenantId !== currentStaffRow.tenantId) {
    return { error: "Staff member not found." };
  }
  if (targetStaff.branchId !== device.branchId) {
    return { error: "This staff member belongs to a different branch than the scanner." };
  }

  const [created] = await db
    .insert(staffBiometricEnrollments)
    .values({
      tenantId: currentStaffRow.tenantId,
      staffId,
      branchDeviceId,
      externalUserId,
      createdBy: currentStaffRow.id,
    })
    .returning();

  await logAudit(db, currentStaffRow, "biometric_enrollment", created.id, "create", {
    newValue: { staffId, branchDeviceId },
    description: `${currentStaffRow.firstName} ${currentStaffRow.lastName} enrolled ${targetStaff.firstName} ${targetStaff.lastName}'s fingerprint`,
    branchId: device.branchId,
  });

  return { success: true };
}

// ─── Record a batch of punches from the sync bridge ────────────────────────
//
// Called once per sync-script poll, with however many new punches it found
// (usually 0-3, occasionally more after a catch-up). All lookups (device,
// enrollments, staff, current attendance state) happen ONCE for the whole
// batch, not once per punch — the only per-punch DB work left is the
// actual attendance write itself, which is a real state change each time
// and can't be collapsed further. Wrapped in one transaction. Audit rows
// are bulk-inserted directly (bypassing logAudit's per-call insert) since
// "attendance" has no override-notification side effect to preserve.
export async function processBiometricPunchBatch(
  branchDeviceId: string,
  punches: { externalUserId: string; timestamp: string }[]
): Promise <
  | {
      success: true;
      results: { externalUserId: string; action: "check_in" | "check_out" | "error"; error?: string }[];
    }
  | { error: string }
> {
  if (punches.length === 0) return { success: true, results: [] };

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, branchDeviceId) });
  if (!device || device.deviceType !== "fingerprint_scanner" || device.status !== "approved") {
    return { error: "Scanner not found or not approved." };
  }
  const { tenantId, branchId } = device;

  // One query: every enrollment on this scanner.
  const enrollments = await db.query.staffBiometricEnrollments.findMany({
    where: eq(staffBiometricEnrollments.branchDeviceId, branchDeviceId),
  });
  const staffIdByExternalId = new Map(enrollments.map((e) => [e.externalUserId, e.staffId]));

  const distinctStaffIds = [...new Set(punches.map((p) => staffIdByExternalId.get(p.externalUserId)).filter((id): id is string => !!id))];

  const results: { externalUserId: string; action: "check_in" | "check_out" | "error"; error?: string }[] = [];

  if (distinctStaffIds.length === 0) {
    return {
      success: true,
      results: punches.map((p) => ({ externalUserId: p.externalUserId, action: "error", error: "Not enrolled" })),
    };
  }

  // One query: staff rows for everyone involved.
  const staffRows = await db.query.staff.findMany({ where: inArray(staff.id, distinctStaffIds) });
  const staffById = new Map(staffRows.map((s) => [s.id, s]));

  // One query: today's attendance row for everyone involved (open or not).
  const todayStr = todayInTenantTz();
  const { start, end } = dayRange(todayStr);
  const todayRows = await db.query.attendance.findMany({
    where: and(inArray(attendance.staffId, distinctStaffIds), sql`${attendance.date} >= ${start}`, sql`${attendance.date} < ${end}`),
  });
  const todayRowByStaffId = new Map(todayRows.map((r) => [r.staffId, r]));
  // In-memory "currently open" tracker — starts from DB state, mutated as
  // we process punches in order so a batch containing both a check-in and
  // check-out for the same staff member alternates correctly.
  const openByStaffId = new Map(todayRows.filter((r) => r.checkIn && !r.checkOut).map((r) => [r.staffId, r]));

  const sortedPunches = [...punches].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const auditRows: (typeof auditLogs.$inferInsert)[] = [];
  const recentNotifyThresholdMs = 10 * 60 * 1000; // only notify for punches within ~10 min of now
  const now = Date.now();

  await db.transaction(async (tx) => {
    for (const punch of sortedPunches) {
      const staffId = staffIdByExternalId.get(punch.externalUserId);
      if (!staffId) {
        results.push({ externalUserId: punch.externalUserId, action: "error", error: "Not enrolled" });
        continue;
      }
      const staffRow = staffById.get(staffId);
      if (!staffRow) {
        results.push({ externalUserId: punch.externalUserId, action: "error", error: "Staff not found" });
        continue;
      }
      const selfName = `${staffRow.firstName} ${staffRow.lastName}`;
      const punchTime = new Date(punch.timestamp);
      const openRow = openByStaffId.get(staffId);

      if (openRow) {
        await tx.update(attendance).set({ checkOut: punchTime, updatedAt: new Date() }).where(eq(attendance.id, openRow.id));
        openByStaffId.delete(staffId);
        auditRows.push({
          tenantId,
          branchId,
          actorId: staffRow.id,
          actorName: selfName,
          resource: "attendance",
          resourceId: openRow.id,
          action: "update",
          newValue: { checkOut: punchTime.toISOString() },
          description: `${selfName} clocked out via fingerprint scanner`,
        });
        results.push({ externalUserId: punch.externalUserId, action: "check_out" });
        if (now - punchTime.getTime() < recentNotifyThresholdMs) {
          await createNotification({
            tenantId,
            branchId,
            type: "staff_shift",
            title: "Staff clocked out",
            message: `${selfName} clocked out (fingerprint).`,
            resourceType: "attendance",
            resourceId: openRow.id,
          });
        }
      } else {
        const existingToday = todayRowByStaffId.get(staffId);
        let attendanceId: string;
        if (existingToday) {
          await tx
            .update(attendance)
            .set({
              status: "present",
              checkIn: punchTime,
              checkOut: null,
              source: "biometric",
              staffName: selfName,
              staffIdSnapshot: staffRow.id,
              loggedBy: null,
              loggedByName: null,
              updatedAt: new Date(),
            })
            .where(eq(attendance.id, existingToday.id));
          attendanceId = existingToday.id;
        } else {
          const [created] = await tx
            .insert(attendance)
            .values({
              tenantId,
              branchId,
              staffId: staffRow.id,
              staffName: selfName,
              staffIdSnapshot: staffRow.id,
              status: "present",
              checkIn: punchTime,
              source: "biometric",
              date: start,
            })
            .returning();
          attendanceId = created.id;
          todayRowByStaffId.set(staffId, created);
        }
        openByStaffId.set(staffId, { id: attendanceId, staffId } as typeof attendance.$inferSelect);
        auditRows.push({
          tenantId,
          branchId,
          actorId: staffRow.id,
          actorName: selfName,
          resource: "attendance",
          resourceId: attendanceId,
          action: "update",
          newValue: { checkIn: punchTime.toISOString() },
          description: `${selfName} clocked in via fingerprint scanner`,
        });
        results.push({ externalUserId: punch.externalUserId, action: "check_in" });
        if (now - punchTime.getTime() < recentNotifyThresholdMs) {
          await createNotification({
            tenantId,
            branchId,
            type: "staff_shift",
            title: "Staff clocked in",
            message: `${selfName} clocked in (fingerprint).`,
            resourceType: "attendance",
            resourceId: attendanceId,
          });
        }
      }
    }

    if (auditRows.length > 0) {
      await tx.insert(auditLogs).values(auditRows);
    }
  });

  await broadcastChange(branchId, "attendance");

  return { success: true, results };
}