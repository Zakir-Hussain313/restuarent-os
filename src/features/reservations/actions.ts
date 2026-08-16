"use server";

import { db } from "@/db";
import { restaurantTables, tableReservations } from "@/db/schema";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";
import { eq, and, asc } from "drizzle-orm";

type CurrentStaff = NonNullable<Awaited<ReturnType<typeof getCurrentStaff>>>;

type GuardResult =
    | { ok: true; staff: CurrentStaff }
    | { ok: false; error: string };

// Same guard shape as features/tables/actions.ts. Duplicated rather than
// imported since it isn't exported from that file — worth pulling into a
// shared helper if a third feature ends up needing the same check.
async function requirePageAccess(): Promise<GuardResult> {
    const currentStaffRow = await getCurrentStaff();
    if (!currentStaffRow) return { ok: false, error: "Not authenticated." };
    if (!hasPermission(currentStaffRow.role, "manage_tables")) {
        return { ok: false, error: "You don't have permission to access reservations." };
    }
    return { ok: true, staff: currentStaffRow };
}

// ── Read ──────────────────────────────────────────────────────────────

export async function getReservationsAction(overrideBranchId?: string) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const isBranchLocked = auth.staff.role === "ADMIN" || auth.staff.role === "STAFF";
    if (isBranchLocked && !auth.staff.branchId) {
        return { data: null, error: "Your account has no branch assigned." };
    }
    const branchFilter = isBranchLocked ? auth.staff.branchId! : overrideBranchId;

    const rows = await db.query.tableReservations.findMany({
        where: and(
            eq(tableReservations.tenantId, auth.staff.tenantId),
            branchFilter ? eq(tableReservations.branchId, branchFilter) : undefined
        ),
        orderBy: [asc(tableReservations.startTime)],
    });

    return { data: rows };
}

// ── Confirm (pending → confirmed) ───────────────────────────────────────

export async function confirmReservationAction(id: string) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.tableReservations.findFirst({
        where: and(eq(tableReservations.id, id), eq(tableReservations.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Reservation not found." };
    if (existing.status !== "pending") {
        return { data: null, error: `Cannot confirm a reservation that is already "${existing.status}".` };
    }

    const [row] = await db
        .update(tableReservations)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(tableReservations.id, id))
        .returning();

    await logAudit(db, auth.staff, "table", id, "status_change", {
        branchId: existing.branchId,
        oldValue: { status: existing.status },
        newValue: { status: "confirmed" },
        description: `confirmed the reservation for ${existing.customerName ?? existing.customerPhone}`,
    });

    return { data: row };
}

// ── Cancel (pending/confirmed → cancelled) ──────────────────────────────

export async function cancelReservationAction(id: string) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.tableReservations.findFirst({
        where: and(eq(tableReservations.id, id), eq(tableReservations.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Reservation not found." };
    if (existing.status === "cancelled" || existing.status === "no_show" || existing.status === "seated") {
        return { data: null, error: `Cannot cancel a reservation that is already "${existing.status}".` };
    }

    const [row] = await db.transaction(async (tx) => {
        const [updated] = await tx
            .update(tableReservations)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(tableReservations.id, id))
            .returning();

        // Only free the table if it's still sitting in "reserved" — if
        // staff already manually overrode it (e.g. to out_of_service),
        // leave it alone rather than clobbering that decision.
        const table = await tx.query.restaurantTables.findFirst({
            where: eq(restaurantTables.id, existing.tableId),
        });
        if (table && table.status === "reserved") {
            await tx
                .update(restaurantTables)
                .set({ status: "available", updatedAt: new Date() })
                .where(eq(restaurantTables.id, existing.tableId));
        }

        return [updated];
    });

    await logAudit(db, auth.staff, "table", id, "status_change", {
        branchId: existing.branchId,
        oldValue: { status: existing.status },
        newValue: { status: "cancelled" },
        description: `cancelled the reservation for ${existing.customerName ?? existing.customerPhone}`,
    });

    return { data: row };
}

// ── No-show (pending/confirmed → no_show) ────────────────────────────────

export async function markNoShowAction(id: string) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.tableReservations.findFirst({
        where: and(eq(tableReservations.id, id), eq(tableReservations.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Reservation not found." };
    if (existing.status === "cancelled" || existing.status === "no_show" || existing.status === "seated") {
        return { data: null, error: `Cannot mark a reservation "no-show" when it's already "${existing.status}".` };
    }

    const [row] = await db.transaction(async (tx) => {
        const [updated] = await tx
            .update(tableReservations)
            .set({ status: "no_show", updatedAt: new Date() })
            .where(eq(tableReservations.id, id))
            .returning();

        const table = await tx.query.restaurantTables.findFirst({
            where: eq(restaurantTables.id, existing.tableId),
        });
        if (table && table.status === "reserved") {
            await tx
                .update(restaurantTables)
                .set({ status: "available", updatedAt: new Date() })
                .where(eq(restaurantTables.id, existing.tableId));
        }

        return [updated];
    });

    await logAudit(db, auth.staff, "table", id, "status_change", {
        branchId: existing.branchId,
        oldValue: { status: existing.status },
        newValue: { status: "no_show" },
        description: `marked the reservation for ${existing.customerName ?? existing.customerPhone} as no-show`,
    });

    return { data: row };
}

// ── Seat (confirmed → seated) ────────────────────────────────────────────

export async function markSeatedAction(id: string) {
    const auth = await requirePageAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.tableReservations.findFirst({
        where: and(eq(tableReservations.id, id), eq(tableReservations.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Reservation not found." };
    if (existing.status !== "confirmed") {
        return { data: null, error: `Cannot seat a reservation that is "${existing.status}" — it must be confirmed first.` };
    }

    const [row] = await db.transaction(async (tx) => {
        const [updated] = await tx
            .update(tableReservations)
            .set({ status: "seated", updatedAt: new Date() })
            .where(eq(tableReservations.id, id))
            .returning();

        await tx
            .update(restaurantTables)
            .set({ status: "occupied", updatedAt: new Date() })
            .where(eq(restaurantTables.id, existing.tableId));

        return [updated];
    });

    await logAudit(db, auth.staff, "table", id, "status_change", {
        branchId: existing.branchId,
        oldValue: { status: existing.status },
        newValue: { status: "seated" },
        description: `seated ${existing.customerName ?? existing.customerPhone} at their table`,
    });

    return { data: row };
}