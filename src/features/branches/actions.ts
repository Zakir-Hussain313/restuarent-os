"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staff, branches } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";
import {
  createBranchSchema,
  type CreateBranchInput,
  updateBranchSchema,
  type UpdateBranchInput,
  bulkReassignStaffSchema,
  type BulkReassignStaffInput,
} from "./schemas";

async function getAuthorizedActor() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." as const };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_branches")) {
    return { error: "You don't have permission to manage branches." as const };
  }

  return { actor: currentStaffRow };
}

// ── Create branch ─────────────────────────────────────────────────────────

export async function createBranchAction(input: CreateBranchInput) {
  const parsed = createBranchSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const auth = await getAuthorizedActor();
  if ("error" in auth) return { error: auth.error };
  const { actor } = auth;

  try {
    const newBranch = await db.transaction(async (tx) => {
      if (parsed.data.isMainBranch) {
        await tx
          .update(branches)
          .set({ isMainBranch: false, updatedAt: new Date() })
          .where(
            and(eq(branches.tenantId, actor.tenantId), eq(branches.isMainBranch, true))
          );
      }

      const [created] = await tx
        .insert(branches)
        .values({
          tenantId: actor.tenantId,
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          email: parsed.data.email ?? null,
          address: parsed.data.address ?? null,
          city: parsed.data.city,
          isMainBranch: parsed.data.isMainBranch ?? false,
        })
        .returning();

      return created;
    });

    await logAudit(db, actor, "branch", newBranch.id, "create", {
      newValue: { name: newBranch.name, city: newBranch.city, isMainBranch: newBranch.isMainBranch },
      description: `Created branch ${newBranch.name}`,
    });

    return { success: true, branch: newBranch };
  } catch (err) {
    return { error: `Failed to create branch: ${(err as Error).message}` };
  }
}

// ── List branches (for the /branches page) ───────────────────────────────

export async function getBranchListAction() {
  const auth = await getAuthorizedActor();
  if ("error" in auth) return { error: auth.error, branches: [] };
  const { actor } = auth;

  const branchList = await db.query.branches.findMany({
    where: eq(branches.tenantId, actor.tenantId),
  });

  return { branches: branchList };
}

// ── Update branch ─────────────────────────────────────────────────────────

export async function updateBranchAction(branchId: string, input: UpdateBranchInput) {
  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const auth = await getAuthorizedActor();
  if ("error" in auth) return { error: auth.error };
  const { actor } = auth;

  const target = await db.query.branches.findFirst({
    where: eq(branches.id, branchId),
  });

  if (!target || target.tenantId !== actor.tenantId) {
    return { error: "Branch not found." };
  }

  const oldSnapshot = {
    name: target.name,
    phone: target.phone,
    email: target.email,
    address: target.address,
    city: target.city,
    isMainBranch: target.isMainBranch,
  };

  try {
    const updated = await db.transaction(async (tx) => {
      if (parsed.data.isMainBranch === true && !target.isMainBranch) {
        await tx
          .update(branches)
          .set({ isMainBranch: false, updatedAt: new Date() })
          .where(
            and(
              eq(branches.tenantId, actor.tenantId),
              eq(branches.isMainBranch, true),
              ne(branches.id, branchId)
            )
          );
      }

      const [result] = await tx
        .update(branches)
        .set({
          name: parsed.data.name ?? target.name,
          phone: parsed.data.phone ?? target.phone,
          email: parsed.data.email ?? target.email,
          address: parsed.data.address ?? target.address,
          city: parsed.data.city ?? target.city,
          image: parsed.data.image ?? target.image,
          isMainBranch: parsed.data.isMainBranch ?? target.isMainBranch,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, branchId))
        .returning();

      return result;
    });

    await logAudit(db, actor, "branch", branchId, "update", {
      oldValue: oldSnapshot,
      newValue: {
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        city: updated.city,
        isMainBranch: updated.isMainBranch,
      },
      description: `Updated branch ${updated.name}`,
    });

    return { success: true, branch: updated };
  } catch (err) {
    return { error: `Failed to update branch: ${(err as Error).message}` };
  }
}

// ── Deactivate branch ──────────────────────────────────────────────────────

export async function deactivateBranchAction(branchId: string, options?: { force?: boolean }) {
  const auth = await getAuthorizedActor();
  if ("error" in auth) return { error: auth.error };
  const { actor } = auth;

  const target = await db.query.branches.findFirst({
    where: eq(branches.id, branchId),
  });

  if (!target || target.tenantId !== actor.tenantId) {
    return { error: "Branch not found." };
  }

  if (target.isMainBranch) {
    return { error: "The main branch cannot be deactivated. Set another branch as main first." };
  }

  if (!options?.force) {
    const activeStaff = await db.query.staff.findMany({
      where: and(eq(staff.branchId, branchId), eq(staff.status, "active")),
    });

    if (activeStaff.length > 0) {
      return { requiresConfirmation: true as const, activeStaff };
    }
  }

  await db
    .update(branches)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(branches.id, branchId));

  await logAudit(db, actor, "branch", branchId, "status_change", {
    oldValue: { isActive: true },
    newValue: { isActive: false },
    description: `Deactivated branch ${target.name}`,
  });

  return { success: true };
}

// ── Reactivate branch ──────────────────────────────────────────────────────

export async function reactivateBranchAction(branchId: string) {
  const auth = await getAuthorizedActor();
  if ("error" in auth) return { error: auth.error };
  const { actor } = auth;

  const target = await db.query.branches.findFirst({
    where: eq(branches.id, branchId),
  });

  if (!target || target.tenantId !== actor.tenantId) {
    return { error: "Branch not found." };
  }

  await db
    .update(branches)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(branches.id, branchId));

  await logAudit(db, actor, "branch", branchId, "status_change", {
    oldValue: { isActive: false },
    newValue: { isActive: true },
    description: `Reactivated branch ${target.name}`,
  });

  return { success: true };
}

// ── Bulk reassign staff to another branch ──────────────────────────────────

export async function bulkReassignStaffAction(input: BulkReassignStaffInput) {
  const parsed = bulkReassignStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const auth = await getAuthorizedActor();
  if ("error" in auth) return { error: auth.error };
  const { actor } = auth;

  const destinationBranch = await db.query.branches.findFirst({
    where: eq(branches.id, parsed.data.newBranchId),
  });

  if (!destinationBranch || destinationBranch.tenantId !== actor.tenantId) {
    return { error: "Destination branch not found." };
  }

  for (const staffId of parsed.data.staffIds) {
    const target = await db.query.staff.findFirst({
      where: eq(staff.id, staffId),
    });

    if (!target || target.tenantId !== actor.tenantId) continue;

    const oldBranchId = target.branchId;

    await db
      .update(staff)
      .set({ branchId: parsed.data.newBranchId, updatedAt: new Date() })
      .where(eq(staff.id, staffId));

    await logAudit(db, actor, "staff", staffId, "update", {
      oldValue: { branchId: oldBranchId },
      newValue: { branchId: parsed.data.newBranchId },
      description: `Moved ${target.firstName} ${target.lastName} to ${destinationBranch.name}`,
    });
  }

  return { success: true };
}