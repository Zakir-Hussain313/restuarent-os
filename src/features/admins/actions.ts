"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { staff, orders, orderDiscounts, payments, coupons, attendance } from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";
import {
  createAdminSchema,
  type CreateAdminInput,
  updateAdminSchema,
  type UpdateAdminInput,
} from "./schemas";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export async function createAdminAction(input: CreateAdminInput) {
  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // ── Authorize: only SUPER_ADMIN can create admins ──────────────────────
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

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_admins")) {
    return { error: "You don't have permission to create admins." };
  }

  const tenantId = currentStaffRow.tenantId;

  // SUPER_ADMIN has no single branch — always store as null.
  const branchId = parsed.data.role === "SUPER_ADMIN" ? null : parsed.data.branchId!;

  // ── Guard: prevent duplicate rows for the same email ────────────────────
  const existingStaff = await db.query.staff.findFirst({
    where: eq(staff.email, parsed.data.email),
  });

  if (existingStaff) {
    return { error: "A user with this email already exists." };
  }

  // inviteUserByEmail always uses Supabase's implicit/hash-fragment flow
  // (#access_token=...), never PKCE — the server-side /auth/callback route
  // can never see hash-fragment tokens (they never reach the server), so
  // this must redirect straight to reset-password, which handles the hash
  // client-side. Do not point this at /auth/callback. (Note:
  // resetPasswordForEmail below, in sendAdminPasswordResetAction, is a
  // different Supabase method that DOES support PKCE — that one correctly
  // stays on /auth/callback and should not be changed.)
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: { role: parsed.data.role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    });

  if (inviteError || !inviteData.user) {
    return { error: `Failed to invite user: ${inviteError?.message}` };
  }

  // ── Set app_metadata.role (used by proxy for RBAC) ──────────────────────
  const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
    inviteData.user.id,
    { app_metadata: { role: parsed.data.role } }
  );

  if (metadataError) {
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return { error: `Failed to set user role: ${metadataError.message}` };
  }

  try {
    const [newAdmin] = await db
      .insert(staff)
      .values({
        id: inviteData.user.id,
        tenantId,
        branchId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        role: parsed.data.role,
        status: "active",
        salary: parsed.data.salary ?? null,
      })
      .returning();

    await logAudit(db, currentStaffRow, "staff", newAdmin.id, "create", {
      newValue: {
        email: newAdmin.email,
        role: newAdmin.role,
        branchId: newAdmin.branchId,
      },
      description: `Invited ${newAdmin.firstName} ${newAdmin.lastName} as ${newAdmin.role}`,
    });

    return { success: true, admin: newAdmin };
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return { error: `Failed to create admin row: ${(err as Error).message}` };
  }
}

// ── List admins (for the /admins page, SUPER_ADMIN only) ────────────────

export async function getAdminsListAction() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated.", admins: [] };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_admins")) {
    return { error: "You don't have permission to view admins.", admins: [] };
  }

  const adminsList = await db.query.staff.findMany({
    where: and(
      eq(staff.tenantId, currentStaffRow.tenantId),
      inArray(staff.role, ADMIN_ROLES)
    ),
  });

  return { admins: adminsList };
}

// ── Update admin ──────────────────────────────────────────────────────────

export async function updateAdminAction(
  adminId: string,
  input: UpdateAdminInput
) {
  const parsed = updateAdminSchema.safeParse(input);
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
    return { error: "You don't have permission to edit admins." };
  }

  const isSelfEdit = adminId === user.id;

  if (!isSelfEdit && !hasPermission(currentStaffRow.role, "manage_admins")) {
    return { error: "You don't have permission to edit admins." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, adminId),
  });

  if (
    !target ||
    target.tenantId !== currentStaffRow.tenantId ||
    !ADMIN_ROLES.includes(target.role as (typeof ADMIN_ROLES)[number])
  ) {
    return { error: "Admin not found." };
  }

  const emailChanged = parsed.data.email && parsed.data.email !== target.email;
  const roleChanged = parsed.data.role && parsed.data.role !== target.role;

  // ── Guard: cannot change your own role ────────────────────────────────
  if (adminId === user.id && roleChanged) {
    return { error: "You cannot change your own role." };
  }

  if (emailChanged) {
    const conflict = await db.query.staff.findFirst({
      where: eq(staff.email, parsed.data.email!),
    });
    if (conflict && conflict.id !== adminId) {
      return { error: "A user with this email already exists." };
    }
  }

  // If the role is becoming SUPER_ADMIN, always clear branchId — a
  // SUPER_ADMIN is never scoped to a single branch.
  const nextRole = parsed.data.role ?? target.role;
  const nextBranchId =
    nextRole === "SUPER_ADMIN" ? null : parsed.data.branchId ?? target.branchId;

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
      role: nextRole,
      branchId: nextBranchId,
      salary: parsed.data.salary ?? target.salary,
      status: parsed.data.status ?? target.status,
      image: parsed.data.image ?? target.image,
      updatedAt: new Date(),
    })
    .where(eq(staff.id, adminId))
    .returning();

  if (emailChanged) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      adminId,
      { email: parsed.data.email! }
    );

    if (authError) {
      await db
        .update(staff)
        .set({ email: target.email, updatedAt: new Date() })
        .where(eq(staff.id, adminId));
      return { error: "Failed to update email. Please try again." };
    }
  }

  if (roleChanged) {
    const { error: roleAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      adminId,
      { app_metadata: { role: updated.role } }
    );

    if (roleAuthError) {
      await db
        .update(staff)
        .set({ role: target.role, branchId: target.branchId, updatedAt: new Date() })
        .where(eq(staff.id, adminId));
      return { error: "Failed to update role. Please try again." };
    }
  }

  await logAudit(db, currentStaffRow, "staff", adminId, "update", {
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
    description: `Updated admin ${updated.firstName} ${updated.lastName}`,
  });

  return { success: true, admin: updated };
}

// ── Deactivate admin ──────────────────────────────────────────────────────

export async function deactivateAdminAction(adminId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_admins")) {
    return { error: "You don't have permission to deactivate admins." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, adminId),
  });

  if (
    !target ||
    target.tenantId !== currentStaffRow.tenantId ||
    !ADMIN_ROLES.includes(target.role as (typeof ADMIN_ROLES)[number])
  ) {
    return { error: "Admin not found." };
  }

  if (adminId === user.id) {
    return { error: "You cannot deactivate your own account." };
  }

  if (target.role === "SUPER_ADMIN") {
    return { error: "Super admin accounts cannot be deactivated." };
  }

  await db
    .update(staff)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(staff.id, adminId));

  await logAudit(db, currentStaffRow, "staff", adminId, "status_change", {
    oldValue: { status: target.status },
    newValue: { status: "inactive" },
    description: `Deactivated admin ${target.firstName} ${target.lastName}`,
  });

  return { success: true };
}

// ── Reactivate admin ───────────────────────────────────────────────────────

export async function reactivateAdminAction(adminId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_admins")) {
    return { error: "You don't have permission to reactivate admins." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, adminId),
  });

  if (
    !target ||
    target.tenantId !== currentStaffRow.tenantId ||
    !ADMIN_ROLES.includes(target.role as (typeof ADMIN_ROLES)[number])
  ) {
    return { error: "Admin not found." };
  }

  await db
    .update(staff)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(staff.id, adminId));

  await logAudit(db, currentStaffRow, "staff", adminId, "status_change", {
    oldValue: { status: target.status },
    newValue: { status: "active" },
    description: `Reactivated admin ${target.firstName} ${target.lastName}`,
  });

  return { success: true };
}

// ── Permanently delete admin (SUPER_ADMIN only — distinct from deactivate) ──

export async function deleteAdminAction(adminId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || currentStaffRow.role !== "SUPER_ADMIN") {
    return { error: "Only super admins can permanently delete admin accounts." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, adminId),
  });

  if (
    !target ||
    target.tenantId !== currentStaffRow.tenantId ||
    !ADMIN_ROLES.includes(target.role as (typeof ADMIN_ROLES)[number])
  ) {
    return { error: "Admin not found." };
  }

  if (adminId === user.id) {
    return { error: "You cannot delete your own account." };
  }

  if (target.role === "SUPER_ADMIN") {
    return { error: "Super admin accounts cannot be deleted." };
  }

  const fullName = `${target.firstName} ${target.lastName}`;
  const idSnapshot = target.id;

  try {
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ staffName: fullName }).where(and(eq(orders.staffId, adminId), isNull(orders.staffName)));
      await tx.update(orderDiscounts).set({ appliedByName: fullName }).where(and(eq(orderDiscounts.appliedBy, adminId), isNull(orderDiscounts.appliedByName)));
      await tx.update(payments).set({ processedByName: fullName }).where(and(eq(payments.processedBy, adminId), isNull(payments.processedByName)));
      await tx.update(coupons).set({ createdByName: fullName }).where(and(eq(coupons.createdBy, adminId), isNull(coupons.createdByName)));
      await tx
        .update(attendance)
        .set({ staffName: fullName, staffIdSnapshot: idSnapshot })
        .where(and(eq(attendance.staffId, adminId), isNull(attendance.staffName)));
      await tx
        .update(attendance)
        .set({ loggedByName: fullName })
        .where(and(eq(attendance.loggedBy, adminId), isNull(attendance.loggedByName)));
    });

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(adminId);
    // If the auth user is already gone (e.g. a prior attempt deleted the
    // auth account but failed before removing the staff row), treat that
    // as already-done instead of blocking the retry.
    const authAlreadyGone = authError?.message?.toLowerCase().includes("not found");
    if (authError && !authAlreadyGone) {
      return { error: `Failed to delete auth account: ${authError.message}` };
    }

    await db.delete(staff).where(eq(staff.id, adminId));

    await logAudit(db, currentStaffRow, "staff", adminId, "delete", {
      oldValue: { email: target.email, role: target.role },
      description: `Permanently deleted admin ${fullName}`,
    });

    return { success: true };
  } catch (err) {
    return { error: `Failed to delete admin: ${(err as Error).message}` };
  }
}

// ── Send password reset to admin ───────────────────────────────────────────

export async function sendAdminPasswordResetAction(adminId: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_admins")) {
    return { error: "You don't have permission to do this." };
  }

  const target = await db.query.staff.findFirst({
    where: eq(staff.id, adminId),
  });

  if (
    !target ||
    target.tenantId !== currentStaffRow.tenantId ||
    !ADMIN_ROLES.includes(target.role as (typeof ADMIN_ROLES)[number])
  ) {
    return { error: "Admin not found." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { error: "Failed to send reset email. Please try again." };
  }

  return { success: true };
}