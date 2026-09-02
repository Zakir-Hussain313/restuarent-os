"use server";

import { db } from "@/db";
import { restaurantTables, tableSections } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { Table, TableSection } from "@/types/table";

const TENANT_ID = process.env.TENANT_ID!;

export async function getPublicTableSectionsAction(
    branchId: string
): Promise<{ data: TableSection[]; error?: undefined } | { data: null; error: string }> {
    if (!branchId) return { data: null, error: "A branch is required." };

    const rows = await db.query.tableSections.findMany({
        where: and(
            eq(tableSections.tenantId, TENANT_ID),
            eq(tableSections.branchId, branchId),
            eq(tableSections.isActive, true)
        ),
        orderBy: [asc(tableSections.name)],
    });

    const data: TableSection[] = rows.map((s) => ({
        id: s.id,
        branchId: s.branchId,
        name: s.name,
        description: s.description ?? undefined,
        isActive: s.isActive,
    }));

    return { data };
}

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
        seatingType: t.seatingType as Table["seatingType"],
        chairLayout: (t.chairLayout as Table["chairLayout"]) ?? undefined,
        notes: t.notes ?? undefined,
        color: t.color as Table["color"],
        positionX: t.positionX ?? undefined,
        positionY: t.positionY ?? undefined,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }));

    return { data };
}