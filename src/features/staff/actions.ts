"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { staff, branches, orders, orderDiscounts, payments, coupons, attendance } from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/features/notifications/actions";
import {
  createStaffSchema,
  type CreateStaffInput,
  updateStaffSchema,
  type UpdateStaffInput,
} from "./schemas";

export async function createStaffAction(input: CreateStaffInput) {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // ── Authorize: only SUPER_ADMIN can create staff ──────────────────────
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to create staff." };
  }

  if (currentStaffRow.role === "ADMIN") {
  if (!["STAFF", "RIDER"].includes(parsed.data.role)) {
    return { error: "You can only assign STAFF or RIDER roles." };
  }
  if (parsed.data.branchId !== currentStaffRow.branchId) {
    return { error: "You can only add staff to your own branch." };
  }
}

  const tenantId = currentStaffRow.tenantId;

  // ── Guard: prevent duplicate staff rows for the same email ─────────────
  const existingStaff = await db.query.staff.findFirst({
    where: eq(staff.email, parsed.data.email),
  });

  if (existingStaff) {
    return { error: "A staff member with this email already exists." };
  }

  // inviteUserByEmail always uses Supabase's implicit/hash-fragment flow
  // (#access_token=...), never PKCE — the server-side /auth/callback route
  // can never see hash-fragment tokens (they never reach the server), so
  // this must redirect straight to reset-password, which handles the hash
  // client-side. Do not point this at /auth/callback.
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { role: parsed.data.role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

  if (inviteError || !inviteData.user) {
    return { error: `Failed to invite user: ${inviteError?.message}` };
  }

  // ── Step 2: set app_metadata.role (used by proxy for RBAC) ────────
  const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
    inviteData.user.id,
    { app_metadata: { role: parsed.data.role } }
  );

  if (metadataError) {
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return { error: `Failed to set user role: ${metadataError.message}` };
  }

  // ── Step 3: create the staff row ────────────────────────────────────────
  try {
    const [newStaff] = await db
      .insert(staff)
      .values({
        id: inviteData.user.id,
        tenantId,
        branchId: parsed.data.branchId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        role: parsed.data.role,
        status: "active",
        salary: parsed.data.salary ?? null,
      })
      .returning();

    await logAudit(db, currentStaffRow, "staff", newStaff.id, "create", {
      newValue: {
        email: newStaff.email,
        role: newStaff.role,
        branchId: newStaff.branchId,
      },
      description: `Invited ${newStaff.firstName} ${newStaff.lastName} as ${newStaff.role}`,
    });

    if (newStaff.branchId) {
      await createNotification({
        tenantId,
        branchId: newStaff.branchId,
        type: "staff_created",
        title: "New account created",
        message: `${newStaff.firstName} ${newStaff.lastName} was added as ${newStaff.role}.`,
        resourceType: "staff",
        resourceId: newStaff.id,
      });
    }

    return { success: true, staff: newStaff };
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return { error: `Failed to create staff row: ${(err as Error).message}` };
  }
}

// ── List staff (for the /staff page) ────────────────────────────────────

export async function getStaffListAction() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated.", staff: [] };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to view staff.", staff: [] };
  }

  if (currentStaffRow.role === "ADMIN" && !currentStaffRow.branchId) {
    return { error: "Your account has no branch assigned.", staff: [] };
  }

  const roleFilter = inArray(staff.role, ["STAFF", "RIDER"]);

  const staffList = await db.query.staff.findMany({
    where:
      currentStaffRow.role === "ADMIN"
        ? and(
            eq(staff.tenantId, currentStaffRow.tenantId),
            eq(staff.branchId, currentStaffRow.branchId as string),
            roleFilter
          )
        : and(eq(staff.tenantId, currentStaffRow.tenantId), roleFilter),
  });

  return { staff: staffList };
}

// ── List branches (for the staff creation form) ──────────────────────────

export async function getBranchesAction() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated.", branches: [] };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow) {
    return { error: "Staff record not found.", branches: [] };
  }

  const branchList = await db.query.branches.findMany({
    where: and(eq(branches.tenantId, currentStaffRow.tenantId), eq(branches.isActive, true)),
  });

  return { branches: branchList };
}

// ── Update staff ─────────────────────────────────────────────────────────

export async function updateStaffAction(
  staffId: string,
  input: UpdateStaffInput
) {
  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow) {
    return { error: "You don't have permission to edit staff." };
  }

  const isSelfEdit = staffId === user.id;

  if (!isSelfEdit && !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to edit staff." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
  });

  if (!target || target.tenantId !== currentStaffRow.tenantId) {
    return { error: "Staff member not found." };
  }

  const emailChanged = parsed.data.email && parsed.data.email !== target.email;
  const roleChanged = parsed.data.role && parsed.data.role !== target.role;

  if (staffId === user.id && roleChanged) {
    return { error: "You cannot change your own role." };
  }

  if (currentStaffRow.role === "ADMIN") {
  if (target.branchId !== currentStaffRow.branchId) {
    return { error: "Staff member not found." };
  }
  if (roleChanged && !["STAFF", "RIDER"].includes(parsed.data.role!)) {
    return { error: "You can only assign STAFF or RIDER roles." };
  }
  if (parsed.data.branchId && parsed.data.branchId !== currentStaffRow.branchId) {
    return { error: "You cannot move staff to another branch." };
  }
}

  if (emailChanged) {
    const conflict = await db.query.staff.findFirst({
      where: eq(staff.email, parsed.data.email!),
    });
    if (conflict && conflict.id !== staffId) {
      return { error: "A staff member with this email already exists." };
    }
  }

  // Snapshot old values before update for audit log
  const oldSnapshot = {
    firstName: target.firstName,
    lastName: target.lastName,
    email: target.email,
    phone: target.phone,
    role: target.role,
    branchId: target.branchId,
    salary: target.salary,
    status: target.status,
  };

  const [updated] = await db
    .update(staff)
    .set({
      firstName: parsed.data.firstName ?? target.firstName,
      lastName: parsed.data.lastName ?? target.lastName,
      email: parsed.data.email ?? target.email,
      phone: parsed.data.phone ?? target.phone,
      role: parsed.data.role ?? target.role,
      branchId: parsed.data.branchId ?? target.branchId,
      salary: parsed.data.salary ?? target.salary,
      status: parsed.data.status ?? target.status,
      image: parsed.data.image ?? target.image,
      updatedAt: new Date(),
    })
    .where(eq(staff.id, staffId))
    .returning();

  if (emailChanged) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      staffId,
      { email: parsed.data.email! }
    );

    if (authError) {
      await db
        .update(staff)
        .set({ email: target.email, updatedAt: new Date() })
        .where(eq(staff.id, staffId));
      return { error: "Failed to update email. Please try again." };
    }
  }

  if (roleChanged) {
    const { error: roleAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      staffId,
      { app_metadata: { role: updated.role } }
    );

    if (roleAuthError) {
      await db
        .update(staff)
        .set({ role: target.role, updatedAt: new Date() })
        .where(eq(staff.id, staffId));
      return { error: "Failed to update role. Please try again." };
    }
  }

  await logAudit(db, currentStaffRow, "staff", staffId, "update", {
    oldValue: oldSnapshot,
    newValue: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      branchId: updated.branchId,
      salary: updated.salary,
      status: updated.status,
    },
    description: `Updated staff member ${updated.firstName} ${updated.lastName}`,
  });

  return { success: true, staff: updated };
}

// ── Deactivate staff ──────────────────────────────────────────────────────

export async function deactivateStaffAction(staffId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to deactivate staff." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
  });

  if (!target || target.tenantId !== currentStaffRow.tenantId) {
    return { error: "Staff member not found." };
  }

  if (staffId === user.id) {
    return { error: "You cannot deactivate your own account." };
  }

  if (target.role === "SUPER_ADMIN") {
    return { error: "Super admin accounts cannot be deactivated." };
  }

  await db
    .update(staff)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(staff.id, staffId));

  await logAudit(db, currentStaffRow, "staff", staffId, "status_change", {
    oldValue: { status: target.status },
    newValue: { status: "inactive" },
    description: `Deactivated ${target.firstName} ${target.lastName}`,
  });

  return { success: true };
}

// ── Reactivate staff ──────────────────────────────────────────────────────

export async function reactivateStaffAction(staffId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to reactivate staff." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
  });

  if (!target || target.tenantId !== currentStaffRow.tenantId) {
    return { error: "Staff member not found." };
  }

  await db
    .update(staff)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(staff.id, staffId));

  await logAudit(db, currentStaffRow, "staff", staffId, "status_change", {
    oldValue: { status: target.status },
    newValue: { status: "active" },
    description: `Reactivated ${target.firstName} ${target.lastName}`,
  });

  return { success: true };
}

// ── Permanently delete staff (distinct from deactivate — historical
// records keep the person's name via *Name snapshot columns) ─────────────

export async function deleteStaffAction(staffId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to delete staff." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
  });

  if (!target || target.tenantId !== currentStaffRow.tenantId) {
    return { error: "Staff member not found." };
  }

  if (!["STAFF", "RIDER"].includes(target.role)) {
    return { error: "Use the admin delete action for ADMIN/SUPER_ADMIN accounts." };
  }

  if (currentStaffRow.role === "ADMIN" && target.branchId !== currentStaffRow.branchId) {
    return { error: "You can only delete staff in your own branch." };
  }

  const fullName = `${target.firstName} ${target.lastName}`;
  const idSnapshot = target.id;

  try {
    // Backfill name snapshots on every historical row still pointing at
    // this staff member, BEFORE the row is deleted — once it's gone,
    // ON DELETE SET NULL clears the FK but can't populate a name we
    // didn't save first.
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ staffName: fullName }).where(and(eq(orders.staffId, staffId), isNull(orders.staffName)));
      await tx.update(orderDiscounts).set({ appliedByName: fullName }).where(and(eq(orderDiscounts.appliedBy, staffId), isNull(orderDiscounts.appliedByName)));
      await tx.update(payments).set({ processedByName: fullName }).where(and(eq(payments.processedBy, staffId), isNull(payments.processedByName)));
      await tx.update(coupons).set({ createdByName: fullName }).where(and(eq(coupons.createdBy, staffId), isNull(coupons.createdByName)));
      await tx
        .update(attendance)
        .set({ staffName: fullName, staffIdSnapshot: idSnapshot })
        .where(and(eq(attendance.staffId, staffId), isNull(attendance.staffName)));
      await tx
        .update(attendance)
        .set({ loggedByName: fullName })
        .where(and(eq(attendance.loggedBy, staffId), isNull(attendance.loggedByName)));
    });

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(staffId);
    // If the auth user is already gone (e.g. a prior attempt deleted the
    // auth account but failed before removing the staff row), treat that
    // as already-done instead of blocking the retry.
    const authAlreadyGone = authError?.message?.toLowerCase().includes("not found");
    if (authError && !authAlreadyGone) {
      return { error: `Failed to delete auth account: ${authError.message}` };
    }

    await db.delete(staff).where(eq(staff.id, staffId));

    await logAudit(db, currentStaffRow, "staff", staffId, "delete", {
      oldValue: { email: target.email, role: target.role },
      description: `Permanently deleted ${fullName}`,
    });

    return { success: true };
  } catch (err) {
    return { error: `Failed to delete staff: ${(err as Error).message}` };
  }
}

// ── Send password reset to staff member ───────────────────────────────────

export async function sendStaffPasswordResetAction(staffId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_staff")) {
    return { error: "You don't have permission to do this." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, staffId),
  });

  if (!target || target.tenantId !== currentStaffRow.tenantId) {
    return { error: "Staff member not found." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { error: "Failed to send reset email. Please try again." };
  }

  return { success: true };
}