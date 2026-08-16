"use server";

import { db } from "@/db";
import { restaurantTables, tableSections } from "@/db/schema";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";
import { eq, and, asc } from "drizzle-orm";
import type { Table } from "@/types";
import { broadcastChange } from "@/lib/realtime/broadcast";

// ── Shared guards ─────────────────────────────────────────────────────────

type CurrentStaff = NonNullable<Awaited<ReturnType<typeof getCurrentStaff>>>;

type GuardResult =
    | { ok: true; staff: CurrentStaff }
    | { ok: false; error: string };

/** Anyone with manage_tables can reach the page / read tables / change status. */
async function requirePageAccess(): Promise<GuardResult> {
    const currentStaffRow = await getCurrentStaff();
    if (!currentStaffRow) return { ok: false, error: "Not authenticated." };
    if (!hasPermission(currentStaffRow.role, "manage_tables")) {
        return { ok: false, error: "You don't have permission to access tables." };
    }
    return { ok: true, staff: currentStaffRow };
}

/**
 * CRUD (create/edit/delete tables & sections) is ADMIN/SUPER_ADMIN only.
 * STAFF holds manage_tables too (for page access + status changes), so this
 * is a role check layered on the permission check, not a separate permission.
 */
async function requireCrudAccess(): Promise<GuardResult> {
    const base = await requirePageAccess();
    if (!base.ok) return base;
    if (base.staff.role !== "ADMIN" && base.staff.role !== "SUPER_ADMIN") {
        return { ok: false, error: "Only admins can create, edit, or delete tables." };
    }
    return base;
}

function resolveBranchId(
    staffRow: CurrentStaff,
    overrideBranchId?: string
): { ok: true; branchId: string } | { ok: false; error: string } {
    const isBranchLocked = staffRow.role === "ADMIN" || staffRow.role === "STAFF";
    if (isBranchLocked) {
        if (!staffRow.branchId) return { ok: false, error: "Your account has no branch assigned." };
        return { ok: true, branchId: staffRow.branchId };
    }
    // SUPER_ADMIN must specify a branch for writes (reads can be unfiltered).
    if (!overrideBranchId) return { ok: false, error: "A branch must be selected." };
    return { ok: true, branchId: overrideBranchId };
}
// ── Table Sections ──────────────────────────────────────────────────────

export async function getTableSectionsAction(overrideBranchId?: string) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const branch = resolveBranchId(auth.staff, overrideBranchId);
    const branchIdFilter = branch.ok ? branch.branchId : undefined;
    const rows = await db.query.tableSections.findMany({
        where: and(
            eq(tableSections.tenantId, auth.staff.tenantId),
            branchIdFilter ? eq(tableSections.branchId, branchIdFilter) : undefined,
            eq(tableSections.isActive, true)
        ),
        orderBy: [asc(tableSections.name)],
    });
    return { data: rows };
}

export async function createTableSectionAction(input: {
    name: string;
    description?: string;
    branchId?: string;
}) {
    const auth = await requireCrudAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const name = input.name.trim();
    if (!name) return { data: null, error: "Section name is required." };

    const branch = resolveBranchId(auth.staff, input.branchId);
    if (!branch.ok) return { data: null, error: branch.error };

    const [row] = await db
        .insert(tableSections)
        .values({
            tenantId: auth.staff.tenantId,
            branchId: branch.branchId,
            name,
            description: input.description?.trim() || null,
        })
        .returning();

    await logAudit(db, auth.staff, "table", row.id, "create", {
        branchId: branch.branchId,
        newValue: row,
        description: `created the "${name}" section`,
    });

    return { data: row };
}

export async function updateTableSectionAction(
    id: string,
    input: { name?: string; description?: string; isActive?: boolean }
) {
    const auth = await requireCrudAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.tableSections.findFirst({
        where: and(eq(tableSections.id, id), eq(tableSections.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Section not found." };

    const [row] = await db
        .update(tableSections)
        .set({
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            updatedAt: new Date(),
        })
        .where(eq(tableSections.id, id))
        .returning();

    await logAudit(db, auth.staff, "table", id, "update", {
        branchId: existing.branchId,
        oldValue: existing,
        newValue: row,
    });

    await broadcastChange(existing.branchId, "tables");

    return { data: row };
}

export async function deleteTableSectionAction(id: string) {
    const auth = await requireCrudAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.tableSections.findFirst({
        where: and(eq(tableSections.id, id), eq(tableSections.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Section not found." };

    const activeTables = await db.query.restaurantTables.findFirst({
        where: and(eq(restaurantTables.sectionId, id), eq(restaurantTables.isActive, true)),
    });
    if (activeTables) {
        return { data: null, error: "Move or delete this section's tables before deleting it." };
    }

    const [row] = await db
        .update(tableSections)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tableSections.id, id))
        .returning();

    await logAudit(db, auth.staff, "table", id, "delete", {
        branchId: existing.branchId,
        oldValue: existing,
        description: `deleted the "${existing.name}" section`,
    });

    await broadcastChange(existing.branchId, "tables");

    return { data: row };
}

// ── Tables ─────────────────────────────────────────────────────────────

export async function getTablesAction(
    overrideBranchId?: string
): Promise<{ data: Table[]; error?: undefined } | { data: null; error: string }> {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const branch = resolveBranchId(auth.staff, overrideBranchId);
    if (!branch.ok) return { data: null, error: branch.error };

    const rows = await db.query.restaurantTables.findMany({
        where: and(
            eq(restaurantTables.tenantId, auth.staff.tenantId),
            eq(restaurantTables.branchId, branch.branchId),
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
        notes: t.notes ?? undefined,
        positionX: t.positionX ?? undefined,
        positionY: t.positionY ?? undefined,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }));

    return { data };
}

export async function createTableAction(input: {
    sectionId: string;
    tableNumber: string;
    capacity: number;
    shape?: "square" | "rectangle" | "circle" | "oval";
    branchId?: string;
    positionX?: number;
    positionY?: number;
}) {
    const auth = await requireCrudAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const tableNumber = input.tableNumber.trim();
    if (!tableNumber) return { data: null, error: "Table number is required." };
    if (!Number.isInteger(input.capacity) || input.capacity < 1) {
        return { data: null, error: "Capacity must be a positive whole number." };
    }

    const branch = resolveBranchId(auth.staff, input.branchId);
    if (!branch.ok) return { data: null, error: branch.error };

    const section = await db.query.tableSections.findFirst({
        where: and(
            eq(tableSections.id, input.sectionId),
            eq(tableSections.tenantId, auth.staff.tenantId),
            eq(tableSections.branchId, branch.branchId)
        ),
    });
    if (!section) return { data: null, error: "Section not found for this branch." };

    const [row] = await db
        .insert(restaurantTables)
        .values({
            tenantId: auth.staff.tenantId,
            branchId: branch.branchId,
            sectionId: input.sectionId,
            tableNumber,
            capacity: input.capacity,
            shape: input.shape ?? "square",
            positionX: input.positionX,
            positionY: input.positionY,
        })
        .returning();

    await logAudit(db, auth.staff, "table", row.id, "create", {
        branchId: branch.branchId,
        newValue: row,
        description: `added table "${tableNumber}"`,
    });

    await broadcastChange(branch.branchId, "tables");

    return { data: row };
}

export async function updateTableAction(
    id: string,
    input: {
        sectionId?: string;
        tableNumber?: string;
        capacity?: number;
        shape?: "square" | "rectangle" | "circle" | "oval";
        positionX?: number;
        positionY?: number;
    }
) {
    const auth = await requireCrudAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.restaurantTables.findFirst({
        where: and(eq(restaurantTables.id, id), eq(restaurantTables.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Table not found." };

    if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity < 1)) {
        return { data: null, error: "Capacity must be a positive whole number." };
    }

    const [row] = await db
        .update(restaurantTables)
        .set({
            ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
            ...(input.tableNumber !== undefined ? { tableNumber: input.tableNumber.trim() } : {}),
            ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
            ...(input.shape !== undefined ? { shape: input.shape } : {}),
            ...(input.positionX !== undefined ? { positionX: input.positionX } : {}),
            ...(input.positionY !== undefined ? { positionY: input.positionY } : {}),
            updatedAt: new Date(),
        })
        .where(eq(restaurantTables.id, id))
        .returning();

    await logAudit(db, auth.staff, "table", id, "update", {
        branchId: existing.branchId,
        oldValue: existing,
        newValue: row,
    });

    await broadcastChange(existing.branchId, "tables");

    return { data: row };
}

export async function deleteTableAction(id: string) {
    const auth = await requireCrudAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.restaurantTables.findFirst({
        where: and(eq(restaurantTables.id, id), eq(restaurantTables.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Table not found." };

    if (existing.status === "occupied") {
        return { data: null, error: "Cannot delete a table that is currently occupied." };
    }

    const [row] = await db
        .update(restaurantTables)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(restaurantTables.id, id))
        .returning();

    await logAudit(db, auth.staff, "table", id, "delete", {
        branchId: existing.branchId,
        oldValue: existing,
        description: `deleted table "${existing.tableNumber}"`,
    });

    await broadcastChange(existing.branchId, "tables");

    return { data: row };
}

// ── Manual status change (STAFF + ADMIN + SUPER_ADMIN) ──────────────────

export async function updateTableStatusAction(
    id: string,
    status: "available" | "occupied" | "reserved" | "out_of_service",
    notes?: string
) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.restaurantTables.findFirst({
        where: and(eq(restaurantTables.id, id), eq(restaurantTables.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Table not found." };

    const [row] = await db
        .update(restaurantTables)
        .set({
            status,
            notes: notes !== undefined ? notes.trim() || null : existing.notes,
            updatedAt: new Date(),
        })
        .where(eq(restaurantTables.id, id))
        .returning();

    await logAudit(db, auth.staff, "table", id, "status_change", {
        branchId: existing.branchId,
        oldValue: { status: existing.status },
        newValue: { status: row.status, notes: row.notes },
        description: `manually changed table "${existing.tableNumber}" to ${status.replace(/_/g, " ")}`,
    });

    await broadcastChange(existing.branchId, "tables");

    return { data: row };
}