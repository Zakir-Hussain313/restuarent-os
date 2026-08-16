"use server";

import { db } from "@/db";
import { restaurantTables } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { Table } from "@/types/table";

const TENANT_ID = process.env.TENANT_ID!;

export async function getPublicTablesAction(
    branchId: string
): Promise<{ data: Table[]; error?: undefined } | { data: null; error: string }> {
    if (!branchId) return { data: null, error: "A branch is required." };

    const rows = await db.query.restaurantTables.findMany({
        where: and(
            eq(restaurantTables.tenantId, TENANT_ID),
            eq(restaurantTables.branchId, branchId),
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