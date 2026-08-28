"use server";

import { db } from "@/db";
import { branchDevices, staff } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getSupabaseServerClient } from "@/lib/supabase";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { hasPermission } from "@/types/staff";
import { and, eq } from "drizzle-orm";

export async function getBranchDevicesAction(
  overrideBranchId?: string
): Promise<{ data: (typeof branchDevices.$inferSelect & { requestedByName: string })[]; error?: undefined } | { data: null; error: string }> {
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
      branchId ? eq(branchDevices.branchId, branchId) : undefined
    ),
    with: { requestedByStaff: { columns: { firstName: true, lastName: true } } },
  });

  return {
    data: rows.map((r) => ({
      ...r,
      requestedByName: `${r.requestedByStaff.firstName} ${r.requestedByStaff.lastName}`,
    })),
  };
}

export async function approveDeviceAction(
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
    return { error: "You don't have permission to approve devices." };
  }

  const device = await db.query.branchDevices.findFirst({ where: eq(branchDevices.id, deviceId) });
  if (!device || device.tenantId !== currentStaffRow.tenantId) {
    return { error: "Device not found." };
  }
  if (currentStaffRow.role === "ADMIN" && device.branchId !== currentStaffRow.branchId) {
    return { error: "You can only approve devices for your own branch." };
  }

  await db
    .update(branchDevices)
    .set({ status: "approved", approvedBy: currentStaffRow.id, approvedAt: new Date() })
    .where(eq(branchDevices.id, deviceId));

  await logAudit(db, currentStaffRow, "branch_device", deviceId, "update", {
    newValue: { status: "approved" },
    description: `Approved a new device for branch`,
  });

  await broadcastChange(device.branchId, "notifications");

  return { success: true };
}