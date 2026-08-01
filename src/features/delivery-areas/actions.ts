// src/features/delivery-areas/actions.ts
"use server";

import { db } from "@/db";
import { branchDeliveryAreas, branches, staff } from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Input shape ────────────────────────────────────────────────────────

export interface DeliveryAreaInput {
    branchId: string;
    city: string;
    area: string;
}

// ─── Normalization ──────────────────────────────────────────────────────
// Prevents "DHA Phase 5" and "dha  phase 5" from being treated as distinct
// areas by the tenant_city_area unique constraint. Applied at write-time
// only — all future rows are stored clean, so no read-path changes needed.

function normalizeAreaField(value: string): string {
    return value
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

// ─── Shared auth helper (same pattern as orders actions) ───────────────

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

// ─── Branch count (feature gate: only relevant with 2+ branches) ───────

export async function getBranchCountAction(): Promise<{ data: number; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };

    const [row] = await db
        .select({ value: count() })
        .from(branches)
        .where(eq(branches.tenantId, auth.staff.tenantId));

    return { data: row?.value ?? 0 };
}

// ─── Read ────────────────────────────────────────────────────────────────

export async function getDeliveryAreasAction(
    branchId: string
): Promise<{ data: typeof branchDeliveryAreas.$inferSelect[]; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    if (auth.staff.role !== "SUPER_ADMIN") {
        return { data: null, error: "Only SUPER_ADMIN can manage delivery areas." };
    }

    const rows = await db.query.branchDeliveryAreas.findMany({
        where: and(
            eq(branchDeliveryAreas.tenantId, auth.staff.tenantId),
            eq(branchDeliveryAreas.branchId, branchId)
        ),
        orderBy: (t, { asc }) => [asc(t.city), asc(t.area)],
    });

    return { data: rows };
}

// ─── Create ──────────────────────────────────────────────────────────────

export async function addDeliveryAreaAction(
    input: DeliveryAreaInput
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    if (auth.staff.role !== "SUPER_ADMIN") {
        return { error: "Only SUPER_ADMIN can manage delivery areas." };
    }

    const city = normalizeAreaField(input.city);
    const area = normalizeAreaField(input.area);

    try {
        await db.insert(branchDeliveryAreas).values({
            tenantId: auth.staff.tenantId,
            branchId: input.branchId,
            city,
            area,
        });
    } catch (err) {
        const error = err as Error & { cause?: { message?: string } };
        const causeMessage = error.cause?.message ?? "";
        if (causeMessage.includes("branch_delivery_areas_tenant_city_area_udx")) {
            return { error: `"${area}, ${city}" is already assigned to a branch. Each area can only belong to one branch tenant-wide.` };
        }
        return { error: `Failed to add delivery area: ${error.message}` };
    }

    revalidatePath("/settings/delivery-areas");
    return { success: true };
}

// ─── Update ──────────────────────────────────────────────────────────────

export async function editDeliveryAreaAction(
    id: string,
    input: DeliveryAreaInput
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    if (auth.staff.role !== "SUPER_ADMIN") {
        return { error: "Only SUPER_ADMIN can manage delivery areas." };
    }

    const existing = await db.query.branchDeliveryAreas.findFirst({
        where: and(eq(branchDeliveryAreas.id, id), eq(branchDeliveryAreas.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { error: "Delivery area not found." };

    const city = normalizeAreaField(input.city);
    const area = normalizeAreaField(input.area);

    try {
        await db
            .update(branchDeliveryAreas)
            .set({ city, area, updatedAt: new Date() })
            .where(and(eq(branchDeliveryAreas.id, id), eq(branchDeliveryAreas.tenantId, auth.staff.tenantId)));
    } catch (err) {
        const error = err as Error & { cause?: { message?: string } };
        const causeMessage = error.cause?.message ?? "";
        if (causeMessage.includes("branch_delivery_areas_tenant_city_area_udx")) {
            return { error: `"${area}, ${city}" is already assigned to a branch. Each area can only belong to one branch tenant-wide.` };
        }
        return { error: `Failed to update delivery area: ${error.message}` };
    }

    revalidatePath("/settings/delivery-areas");
    return { success: true };
}

// ─── Delete ──────────────────────────────────────────────────────────────

export async function deleteDeliveryAreaAction(
    id: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    if (auth.staff.role !== "SUPER_ADMIN") {
        return { error: "Only SUPER_ADMIN can manage delivery areas." };
    }

    const existing = await db.query.branchDeliveryAreas.findFirst({
        where: and(eq(branchDeliveryAreas.id, id), eq(branchDeliveryAreas.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { error: "Delivery area not found." };

    await db
        .delete(branchDeliveryAreas)
        .where(and(eq(branchDeliveryAreas.id, id), eq(branchDeliveryAreas.tenantId, auth.staff.tenantId)));

    revalidatePath("/settings/delivery-areas");
    return { success: true };
}