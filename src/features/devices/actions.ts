"use server";

import { db } from "@/db";
import { branchDevices, staff } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getSupabaseServerClient } from "@/lib/supabase";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { hasPermission } from "@/types/staff";
import { and, eq } from "drizzle-orm";

// Used by the Attendance page to decide whether to show the old "Devices"
// tab (browser self-service approval) or the new "Scanner" tab. A branch
// with an approved fingerprint scanner uses the scanner exclusively.
export async function getBranchAttendanceMethodAction(
  overrideBranchId?: string
): Promise<{ data: { hasApprovedScanner: boolean }; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  const branchId = isAdmin ? currentStaffRow.branchId ?? undefined : (overrideBranchId ?? currentStaffRow.branchId ?? undefined);
  if (!branchId) return { data: { hasApprovedScanner: false } };

  const scanner = await db.query.branchDevices.findFirst({
    where: and(
      eq(branchDevices.branchId, branchId),
      eq(branchDevices.deviceType, "fingerprint_scanner"),
      eq(branchDevices.status, "approved")
    ),
  });

  return { data: { hasApprovedScanner: !!scanner } };
}

export async function getBranchDevicesAction(
  overrideBranchId?: string
): Promise<{ data: (typeof branchDevices.$inferSelect & { requestedByName: string; requestedByEmail: string; requestedByPhone: string | null })[]; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { data: null, error: "You don't have permission to view devices." };
  }

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const rows = await db.query.branchDevices.findMany({
    where: and(
      eq(branchDevices.tenantId, currentStaffRow.tenantId),
      eq(branchDevices.deviceType, "browser"),
      branchId ? eq(branchDevices.branchId, branchId) : undefined
    ),
    with: { requestedByStaff: { columns: { firstName: true, lastName: true, email: true, phone: true } } },
  });

  return {
    data: rows.map((r) => ({
      ...r,
      requestedByName: `${r.requestedByStaff.firstName} ${r.requestedByStaff.lastName}`,
      requestedByEmail: r.requestedByStaff.email,
      requestedByPhone: r.requestedByStaff.phone,
    })),
  };
}

export async function setDeviceStatusAction(
  deviceId: string,
  status: "approved" | "rejected"
): Promise<{ success: true; error?: undefined } | { error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { error: "You don't have permission to manage devices." };
  }

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, deviceId) });
  if (!device || device.tenantId !== currentStaffRow.tenantId) {
    return { error: "Device not found." };
  }
  if (currentStaffRow.role === "ADMIN" && device.branchId !== currentStaffRow.branchId) {
    return { error: "You can only manage devices for your own branch." };
  }

  await db
    .update(branchDevices)
    .set({
      status,
      approvedBy: status === "approved" ? currentStaffRow.id : null,
      approvedAt: status === "approved" ? new Date() : null,
    })
    .where(eq(branchDevices.id, deviceId));

  await logAudit(db, currentStaffRow, "branch_device", deviceId, "update", {
    newValue: { status },
    description: status === "approved" ? "Approved a device for branch" : "Rejected/blocked a device for branch",
  });

  await broadcastChange(device.branchId, "attendance");

  return { success: true };
}



export async function deleteDeviceAction(
  deviceId: string
): Promise<{ success: true; error?: undefined } | { error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { error: "You don't have permission to delete devices." };
  }

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, deviceId) });
  if (!device || device.tenantId !== currentStaffRow.tenantId) {
    return { error: "Device not found." };
  }
  if (currentStaffRow.role === "ADMIN" && device.branchId !== currentStaffRow.branchId) {
    return { error: "You can only delete devices for your own branch." };
  }

  await db.delete(branchDevices).where(eq(branchDevices.id, deviceId));

  await logAudit(db, currentStaffRow, "branch_device", deviceId, "delete", {
    description: "Deleted a branch device",
  });

  await broadcastChange(device.branchId, "attendance");

  return { success: true };
}

import { staffBiometricEnrollments } from "@/db/schema";

// ── Scanner devices for a branch (list, with enrollment counts) ───────────

export async function getBranchScannerDevicesAction(
  overrideBranchId?: string
): Promise<{ data: (typeof branchDevices.$inferSelect & { enrollmentCount: number })[]; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { data: null, error: "You don't have permission to view scanners." };
  }

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const rows = await db.query.branchDevices.findMany({
    where: and(
      eq(branchDevices.tenantId, currentStaffRow.tenantId),
      eq(branchDevices.deviceType, "fingerprint_scanner"),
      branchId ? eq(branchDevices.branchId, branchId) : undefined
    ),
    with: { biometricEnrollments: { columns: { id: true } } },
  });

  return { data: rows.map((r) => ({ ...r, enrollmentCount: r.biometricEnrollments.length })) };
}

// ── Enrollments for one scanner (staff names, for the enroll list) ─────────

export async function getScannerEnrollmentsAction(
  branchDeviceId: string
): Promise<{ data: { id: string; staffId: string; staffName: string; externalUserId: string }[]; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { data: null, error: "You don't have permission to view enrollments." };
  }

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, branchDeviceId) });
  if (!device || device.tenantId !== currentStaffRow.tenantId) {
    return { data: null, error: "Scanner not found." };
  }
  if (currentStaffRow.role === "ADMIN" && device.branchId !== currentStaffRow.branchId) {
    return { data: null, error: "You can only view enrollments for your own branch." };
  }

  const rows = await db.query.staffBiometricEnrollments.findMany({
    where: eq(staffBiometricEnrollments.branchDeviceId, branchDeviceId),
    with: { staff: { columns: { firstName: true, lastName: true } } },
  });

  return {
    data: rows.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      staffName: `${r.staff.firstName} ${r.staff.lastName}`,
      externalUserId: r.externalUserId,
    })),
  };
}

// ── Remove a fingerprint enrollment ─────────────────────────────────────────

export async function unenrollStaffBiometricAction(
  enrollmentId: string
): Promise<{ success: true; error?: undefined } | { error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({ where: eq(staff.id, user.id) });
  if (!currentStaffRow) return { error: "Staff record not found." };
  if (!hasPermission(currentStaffRow.role, "manage_attendance")) {
    return { error: "You don't have permission to remove enrollments." };
  }

  const enrollment = await db.query.staffBiometricEnrollments.findFirst({
    where: eq(staffBiometricEnrollments.id, enrollmentId),
    with: { branchDevice: true },
  });
  if (!enrollment || enrollment.tenantId !== currentStaffRow.tenantId) {
    return { error: "Enrollment not found." };
  }
  if (currentStaffRow.role === "ADMIN" && enrollment.branchDevice.branchId !== currentStaffRow.branchId) {
    return { error: "You can only manage enrollments for your own branch." };
  }

  await db.delete(staffBiometricEnrollments).where(eq(staffBiometricEnrollments.id, enrollmentId));

  await logAudit(db, currentStaffRow, "biometric_enrollment", enrollmentId, "delete", {
    description: `Removed a fingerprint enrollment`,
    branchId: enrollment.branchDevice.branchId,
  });

  return { success: true };
}