"use server";

import { db } from "@/db";
import { tenantSettings, branches, Staff } from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { eq, and } from "drizzle-orm";
import { hasPermission } from "@/types/staff";

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

// ── Get current website branch setting ───────────────────────────────────

export async function getWebsiteBranchSettingAction(): Promise <
    | { data: { websiteBranchId: string | null }; error?: undefined }
    | { data: null; error: string }
> {
    const auth = await getAuthorizedActor();
    if (!auth.ok) return { data: null, error: auth.error };
    const { actor } = auth;

    const settings = await db.query.tenantSettings.findFirst({
        where: eq(tenantSettings.tenantId, actor.tenantId),
        columns: { websiteBranchId: true },
    });

    return { data: { websiteBranchId: settings?.websiteBranchId ?? null } };
}

// ── Set website branch setting ────────────────────────────────────────────

export async function setWebsiteBranchSettingAction(
    branchId: string | null
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getAuthorizedActor();
    if (!auth.ok) return { error: auth.error };
    const { actor } = auth;

    // Verify the branch actually belongs to this tenant before saving —
    // never trust a client-supplied ID as-is.
    if (branchId) {
        const target = await db.query.branches.findFirst({
            where: and(eq(branches.id, branchId), eq(branches.tenantId, actor.tenantId)),
        });
        if (!target) return { error: "Branch not found." };
    }

    await db
        .insert(tenantSettings)
        .values({ tenantId: actor.tenantId, websiteBranchId: branchId })
        .onConflictDoUpdate({
            target: tenantSettings.tenantId,
            set: { websiteBranchId: branchId, updatedAt: new Date() },
        });

    return { success: true };
}