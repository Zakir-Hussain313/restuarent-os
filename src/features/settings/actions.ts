"use server";

import { db } from "@/db";
import { branchSettings, branches, type Staff } from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";

async function getAuthorizedActor(): Promise <
  | { ok: true; actor: Staff }
  | { ok: false; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: (staff, { eq }) => eq(staff.id, user.id),
  });

  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "manage_settings")) {
    return { ok: false, error: "You don't have permission to manage this setting." };
  }

  return { ok: true, actor: currentStaffRow };
}

// ADMIN can only touch their own branch; SUPER_ADMIN can touch any branch
// in their tenant.
async function assertBranchInScope(actor: Staff, branchId: string): Promise<string | null> {
  const branch = await db.query.branches.findFirst({
    where: and(eq(branches.id, branchId), eq(branches.tenantId, actor.tenantId)),
  });

  if (!branch) return "Branch not found.";

  if (actor.role === "ADMIN" && actor.branchId !== branchId) {
    return "You can only manage settings for your own branch.";
  }

  return null;
}

// ── Get branch settings ───────────────────────────────────────────────────

export async function getBranchSettingsAction(branchId: string): Promise <
  | { data: { posAutoConfirmOnPlace: boolean }; error?: undefined }
  | { data: null; error: string }
> {
  const auth = await getAuthorizedActor();
  if (!auth.ok) return { data: null, error: auth.error };
  const { actor } = auth;

  const scopeError = await assertBranchInScope(actor, branchId);
  if (scopeError) return { data: null, error: scopeError };

  const settings = await db.query.branchSettings.findFirst({
    where: eq(branchSettings.branchId, branchId),
    columns: { posAutoConfirmOnPlace: true },
  });

  return { data: { posAutoConfirmOnPlace: settings?.posAutoConfirmOnPlace ?? false } };
}

// ── Set POS auto-confirm setting ────────────────────────────────────────────

export async function setPosAutoConfirmAction(
  branchId: string,
  value: boolean
): Promise<{ success: true } | { success?: undefined; error: string }> {
  const auth = await getAuthorizedActor();
  if (!auth.ok) return { error: auth.error };
  const { actor } = auth;

  const scopeError = await assertBranchInScope(actor, branchId);
  if (scopeError) return { error: scopeError };

  const previous = await db.query.branchSettings.findFirst({
    where: eq(branchSettings.branchId, branchId),
  });

  await db
    .insert(branchSettings)
    .values({ tenantId: actor.tenantId, branchId, posAutoConfirmOnPlace: value })
    .onConflictDoUpdate({
      target: branchSettings.branchId,
      set: { posAutoConfirmOnPlace: value, updatedAt: new Date() },
    });

  await logAudit(db, actor, "branch_settings", branchId, "update", {
  oldValue: { posAutoConfirmOnPlace: previous?.posAutoConfirmOnPlace ?? false },
  newValue: { posAutoConfirmOnPlace: value },
});

  return { success: true };
}


// ── Read-only: POS auto-confirm setting for POS usage ─────────────────────
// Unlike getBranchSettingsAction (which requires manage_settings, for the
// Settings page), this only requires access_pos — any staff placing orders
// needs to read this value, not just admins editing it.

export async function getPosAutoConfirmSettingAction(
  branchId: string
): Promise<{ data: { posAutoConfirmOnPlace: boolean }; error?: undefined } | { data: null; error: string }> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: (staff, { eq }) => eq(staff.id, user.id),
  });
  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "access_pos")) {
    return { data: null, error: "You don't have permission to access POS." };
  }

  const branch = await db.query.branches.findFirst({
    where: and(eq(branches.id, branchId), eq(branches.tenantId, currentStaffRow.tenantId)),
  });
  if (!branch) return { data: null, error: "Branch not found." };

  const settings = await db.query.branchSettings.findFirst({
    where: eq(branchSettings.branchId, branchId),
    columns: { posAutoConfirmOnPlace: true },
  });

  return { data: { posAutoConfirmOnPlace: settings?.posAutoConfirmOnPlace ?? false } };
}