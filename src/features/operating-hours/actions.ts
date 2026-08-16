// src/features/operating-hours/actions.ts
"use server";

import { db } from "@/db";
import { branches, staff } from "@/db/schema";
import type { OperatingHours } from "@/db/schema/branches";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Shared auth helper (same pattern as delivery-areas actions) ───────

async function getCurrentStaff() {
    const supabase = await getSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, error: "Not authenticated." };

    const currentStaffRow = await db.query.staff.findFirst({
        where: eq(staff.id, user.id),
    });
    if (!currentStaffRow) return { ok: false as const, error: "Staff record not found." };

    return { ok: true as const, staff: currentStaffRow };
}

// ─── Authorization: SUPER_ADMIN can manage any branch; ADMIN only their own ─

function canManageOperatingHoursForBranch(
    staffRow: { role: string; branchId: string | null },
    branchId: string
): boolean {
    if (staffRow.role === "SUPER_ADMIN") return true;
    if (staffRow.role === "ADMIN" && staffRow.branchId === branchId) return true;
    return false;
}

// ─── Read ────────────────────────────────────────────────────────────────

export async function getOperatingHoursAction(
    branchId: string
): Promise<{ data: OperatingHours | null; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    if (!canManageOperatingHoursForBranch(auth.staff, branchId)) {
        return { data: null, error: "You don't have permission to view operating hours for this branch." };
    }

    const branch = await db.query.branches.findFirst({
        where: eq(branches.id, branchId),
        columns: { tenantId: true, operatingHours: true },
    });
    if (!branch || branch.tenantId !== auth.staff.tenantId) {
        return { data: null, error: "Branch not found." };
    }

    return { data: branch.operatingHours ?? null };
}

// ─── Update ──────────────────────────────────────────────────────────────

export async function updateOperatingHoursAction(
    branchId: string,
    hours: OperatingHours
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    if (!canManageOperatingHoursForBranch(auth.staff, branchId)) {
        return { error: "You don't have permission to manage operating hours for this branch." };
    }

    const branch = await db.query.branches.findFirst({
        where: eq(branches.id, branchId),
        columns: { tenantId: true },
    });
    if (!branch || branch.tenantId !== auth.staff.tenantId) {
        return { error: "Branch not found." };
    }

    try {
        await db
            .update(branches)
            .set({ operatingHours: hours, updatedAt: new Date() })
            .where(eq(branches.id, branchId));
    } catch (err) {
        const error = err as Error;
        return { error: `Failed to update operating hours: ${error.message}` };
    }

    revalidatePath("/settings/operating-hours");
    return { success: true };
}