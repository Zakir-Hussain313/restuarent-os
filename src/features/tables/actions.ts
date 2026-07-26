"use server";

import { db } from "@/db";
import { restaurantTables, staff } from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and, asc } from "drizzle-orm";
import type { Table } from "@/types";

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

export async function getTablesAction(
    overrideBranchId?: string
): Promise<{ data: Table[]; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    const { staff: currentStaffRow } = auth;

    const isBranchLocked = currentStaffRow.role === "ADMIN" || currentStaffRow.role === "STAFF";
    if (isBranchLocked && !currentStaffRow.branchId) {
        return { data: null, error: "Your account has no branch assigned." };
    }

    const tenantId = currentStaffRow.tenantId;
    const branchId = isBranchLocked ? currentStaffRow.branchId! : overrideBranchId;

    const rows = await db.query.restaurantTables.findMany({
        where: and(
            eq(restaurantTables.tenantId, tenantId),
            branchId ? eq(restaurantTables.branchId, branchId) : undefined,
            eq(restaurantTables.isActive, true)
        ),
        orderBy: [asc(restaurantTables.tableNumber)],
    });

    const data: Table[] = rows.map((t) => ({
        id: t.id,
        branchId: t.branchId,
        sectionId: t.sectionId,
        tableNumber: t.tableNumber,
        capacity: t.capacity,
        shape: t.shape,
        status: t.status,
        positionX: t.positionX ?? undefined,
        positionY: t.positionY ?? undefined,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }));

    return { data };
}