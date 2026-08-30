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