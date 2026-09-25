"use server";

import { db } from "@/db";
import {
    ingredients,
    suppliers,
    stockMovements,
    stockReceipts,
    menuItems,
    menuItemVariants,
    recipeIngredients,
} from "@/db/schema";
import type { Ingredient, StockMovement } from "@/db/schema";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { logAudit } from "@/lib/audit";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

// ── Shared guards ─────────────────────────────────────────────────────────

type CurrentStaff = NonNullable<Awaited<ReturnType<typeof getCurrentStaff>>>;

type GuardResult =
    | { ok: true; staff: CurrentStaff }
    | { ok: false; error: string };

async function requireInventoryAccess(): Promise<GuardResult> {
    const currentStaffRow = await getCurrentStaff();
    if (!currentStaffRow) return { ok: false, error: "Not authenticated." };
    if (!hasPermission(currentStaffRow.role, "manage_inventory")) {
        return { ok: false, error: "You don't have permission to manage inventory." };
    }
    return { ok: true, staff: currentStaffRow };
}

function resolveBranchId(
    staffRow: CurrentStaff,
    overrideBranchId?: string
): { ok: true; branchId: string } | { ok: false; error: string } {
    if (staffRow.role === "ADMIN") {
        if (!staffRow.branchId) return { ok: false, error: "Your account has no branch assigned." };
        return { ok: true, branchId: staffRow.branchId };
    }
    // SUPER_ADMIN must specify a branch for writes.
    if (!overrideBranchId) return { ok: false, error: "A branch must be selected." };
    return { ok: true, branchId: overrideBranchId };
}

/** ADMIN can only touch rows in their own branch. SUPER_ADMIN can touch any. */
function canAccessBranch(staffRow: CurrentStaff, rowBranchId: string): boolean {
    return staffRow.role === "SUPER_ADMIN" || staffRow.branchId === rowBranchId;
}

const UNITS: ReadonlyArray<Ingredient["unit"]> = ["kg", "g", "l", "ml", "pcs"];

// ── Ingredients ───────────────────────────────────────────────────────────

export type IngredientWithStatus = Ingredient & { isLowStock: boolean };

export async function getIngredientsAction(overrideBranchId?: string) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    // ADMIN is always locked to their branch. SUPER_ADMIN with no branch
    // selected sees every branch (read only).
    const branch = resolveBranchId(auth.staff, overrideBranchId);
    const branchIdFilter = branch.ok ? branch.branchId : undefined;

    const rows = await db.query.ingredients.findMany({
        where: and(
            eq(ingredients.tenantId, auth.staff.tenantId),
            branchIdFilter ? eq(ingredients.branchId, branchIdFilter) : undefined
        ),
        orderBy: [asc(ingredients.name)],
    });

    const data: IngredientWithStatus[] = rows.map((r) => ({
        ...r,
        isLowStock: r.lowStockThreshold !== null && r.currentStock <= r.lowStockThreshold,
    }));

    return { data };
}

export async function createIngredientAction(input: {
    name: string;
    unit: Ingredient["unit"];
    lowStockThreshold?: number | null;
    branchId?: string;
}) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const name = input.name.trim();
    if (!name) return { data: null, error: "Ingredient name is required." };
    if (!UNITS.includes(input.unit)) return { data: null, error: "Invalid unit." };
    if (input.lowStockThreshold != null && input.lowStockThreshold < 0) {
        return { data: null, error: "Low-stock threshold cannot be negative." };
    }

    const branch = resolveBranchId(auth.staff, input.branchId);
    if (!branch.ok) return { data: null, error: branch.error };

    const duplicate = await db.query.ingredients.findFirst({
        where: and(
            eq(ingredients.tenantId, auth.staff.tenantId),
            eq(ingredients.branchId, branch.branchId),
            sql`lower(${ingredients.name}) = ${name.toLowerCase()}`
        ),
    });
    if (duplicate) return { data: null, error: `"${name}" already exists in this branch.` };

    // Stock always starts at 0. Opening stock is logged as a stock receipt
    // so every unit in the system has a ledger entry behind it.
    const [row] = await db
        .insert(ingredients)
        .values({
            tenantId: auth.staff.tenantId,
            branchId: branch.branchId,
            name,
            unit: input.unit,
            lowStockThreshold: input.lowStockThreshold ?? null,
        })
        .returning();

    await logAudit(db, auth.staff, "ingredient", row.id, "create", {
        branchId: branch.branchId,
        newValue: row,
        description: `created ingredient "${name}"`,
    });

    return { data: row };
}

export async function updateIngredientAction(
    id: string,
    input: {
        name?: string;
        unit?: Ingredient["unit"];
        lowStockThreshold?: number | null;
        isActive?: boolean;
        image?: string | null;
    }
) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.ingredients.findFirst({
        where: and(eq(ingredients.id, id), eq(ingredients.tenantId, auth.staff.tenantId)),
    });
    if (!existing || !canAccessBranch(auth.staff, existing.branchId)) {
        return { data: null, error: "Ingredient not found." };
    }

    if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) return { data: null, error: "Ingredient name is required." };
        const duplicate = await db.query.ingredients.findFirst({
            where: and(
                eq(ingredients.tenantId, auth.staff.tenantId),
                eq(ingredients.branchId, existing.branchId),
                sql`lower(${ingredients.name}) = ${name.toLowerCase()}`
            ),
        });
        if (duplicate && duplicate.id !== id) {
            return { data: null, error: `"${name}" already exists in this branch.` };
        }
    }

    if (input.lowStockThreshold != null && input.lowStockThreshold < 0) {
        return { data: null, error: "Low-stock threshold cannot be negative." };
    }

    // Changing the unit after any stock activity would silently corrupt every
    // past quantity, so it's only allowed while the ledger is still empty.
    if (input.unit !== undefined && input.unit !== existing.unit) {
        if (!UNITS.includes(input.unit)) return { data: null, error: "Invalid unit." };
        const hasMovements = await db.query.stockMovements.findFirst({
            where: eq(stockMovements.ingredientId, id),
        });
        if (hasMovements) {
            return {
                data: null,
                error: "Unit can't be changed once stock has been recorded. Create a new ingredient instead.",
            };
        }
    }

    const [row] = await db
        .update(ingredients)
        .set({
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.unit !== undefined ? { unit: input.unit } : {}),
            ...(input.lowStockThreshold !== undefined
                ? { lowStockThreshold: input.lowStockThreshold }
                : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.image !== undefined ? { image: input.image } : {}),
            updatedAt: new Date(),
        })
        .where(eq(ingredients.id, id))
        .returning();

    await logAudit(db, auth.staff, "ingredient", id, "update", {
        branchId: existing.branchId,
        oldValue: existing,
        newValue: row,
    });

    return { data: row };
}

export async function deleteIngredientAction(id: string) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { error: auth.error };

    const existing = await db.query.ingredients.findFirst({
        where: and(eq(ingredients.id, id), eq(ingredients.tenantId, auth.staff.tenantId)),
    });
    if (!existing || !canAccessBranch(auth.staff, existing.branchId)) {
        return { error: "Ingredient not found." };
    }

    // Deleting an ingredient with any stock history would cascade away its
    // whole ledger and break historical cost/profit numbers — only allow a
    // hard delete while it's never actually been used. Otherwise, deactivate.
    const hasMovements = await db.query.stockMovements.findFirst({
        where: eq(stockMovements.ingredientId, id),
    });
    if (hasMovements) {
        return {
            error: "This ingredient has stock history and can't be deleted. Deactivate it instead to keep the ledger intact.",
        };
    }

    const hasRecipeUsage = await db.query.recipeIngredients.findFirst({
        where: eq(recipeIngredients.ingredientId, id),
    });
    if (hasRecipeUsage) {
        return {
            error: "This ingredient is used in a menu item's recipe. Remove it from the recipe first, or deactivate instead.",
        };
    }

    await db.delete(ingredients).where(eq(ingredients.id, id));

    await logAudit(db, auth.staff, "ingredient", id, "delete", {
        branchId: existing.branchId,
        oldValue: existing,
        description: `deleted ingredient "${existing.name}"`,
    });

    return { success: true };
}

// ── Suppliers (tenant-wide, not per branch) ───────────────────────────────

export async function getSuppliersAction() {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const rows = await db.query.suppliers.findMany({
        where: eq(suppliers.tenantId, auth.staff.tenantId),
        orderBy: [asc(suppliers.name)],
    });
    return { data: rows };
}

export async function createSupplierAction(input: {
    name: string;
    contactPhone?: string;
    contactEmail?: string;
    notes?: string;
}) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const name = input.name.trim();
    if (!name) return { data: null, error: "Supplier name is required." };

    const [row] = await db
        .insert(suppliers)
        .values({
            tenantId: auth.staff.tenantId,
            name,
            contactPhone: input.contactPhone?.trim() || null,
            contactEmail: input.contactEmail?.trim() || null,
            notes: input.notes?.trim() || null,
        })
        .returning();

    await logAudit(db, auth.staff, "supplier", row.id, "create", {
        newValue: row,
        description: `added supplier "${name}"`,
    });

    return { data: row };
}

export async function updateSupplierAction(
    id: string,
    input: {
        name?: string;
        contactPhone?: string | null;
        contactEmail?: string | null;
        notes?: string | null;
    }
) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const existing = await db.query.suppliers.findFirst({
        where: and(eq(suppliers.id, id), eq(suppliers.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { data: null, error: "Supplier not found." };

    if (input.name !== undefined && !input.name.trim()) {
        return { data: null, error: "Supplier name is required." };
    }

    const [row] = await db
        .update(suppliers)
        .set({
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.contactPhone !== undefined
                ? { contactPhone: input.contactPhone?.trim() || null }
                : {}),
            ...(input.contactEmail !== undefined
                ? { contactEmail: input.contactEmail?.trim() || null }
                : {}),
            ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        })
        .where(eq(suppliers.id, id))
        .returning();

    await logAudit(db, auth.staff, "supplier", id, "update", {
        oldValue: existing,
        newValue: row,
    });

    return { data: row };
}

export async function deleteSupplierAction(id: string) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { error: auth.error };

    const existing = await db.query.suppliers.findFirst({
        where: and(eq(suppliers.id, id), eq(suppliers.tenantId, auth.staff.tenantId)),
    });
    if (!existing) return { error: "Supplier not found." };

    // stock_receipts.supplier_id is ON DELETE SET NULL, so past receipts
    // survive with no supplier attached.
    await db.delete(suppliers).where(eq(suppliers.id, id));

    await logAudit(db, auth.staff, "supplier", id, "delete", {
        oldValue: existing,
        description: `deleted supplier "${existing.name}"`,
    });

    return { success: true };
}

// ── Stock receiving ───────────────────────────────────────────────────────

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export async function receiveStockAction(input: {
    ingredientId: string;
    quantity: number;
    // What was actually paid for this whole delivery, in whole PKR.
    totalCost: number;
    supplierId?: string | null;
    notes?: string;
}) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const quantity = round3(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return { data: null, error: "Quantity must be greater than 0." };
    }
    if (!Number.isInteger(input.totalCost) || input.totalCost < 0) {
        return { data: null, error: "Total cost must be a whole number of rupees (0 or more)." };
    }

    if (input.supplierId) {
        const supplier = await db.query.suppliers.findFirst({
            where: and(
                eq(suppliers.id, input.supplierId),
                eq(suppliers.tenantId, auth.staff.tenantId)
            ),
        });
        if (!supplier) return { data: null, error: "Supplier not found." };
    }

    const staffName = `${auth.staff.firstName} ${auth.staff.lastName}`;

    const result = await db.transaction(async (tx) => {
        // Row lock: two receipts for the same ingredient at once would
        // otherwise both read the old stock and corrupt the running average.
        const [locked] = await tx
            .select()
            .from(ingredients)
            .where(
                and(
                    eq(ingredients.id, input.ingredientId),
                    eq(ingredients.tenantId, auth.staff.tenantId)
                )
            )
            .for("update");

        if (!locked || !canAccessBranch(auth.staff, locked.branchId)) {
            return { error: "Ingredient not found." } as const;
        }
        if (!locked.isActive) {
            return { error: "This ingredient is inactive. Reactivate it first." } as const;
        }

        const oldStock = locked.currentStock;
        const newStock = round3(oldStock + quantity);
        const costPerUnit = Math.round(input.totalCost / quantity);

        // Weighted running average. If stock was empty (or negative from
        // sales that outran recorded stock), the new cost simply becomes
        // the average.
        const newAvg =
            oldStock <= 0
                ? costPerUnit
                : Math.round((oldStock * locked.avgCostPerUnit + input.totalCost) / newStock);

        const [receipt] = await tx
            .insert(stockReceipts)
            .values({
                tenantId: auth.staff.tenantId,
                branchId: locked.branchId,
                ingredientId: locked.id,
                supplierId: input.supplierId ?? null,
                quantity,
                costPerUnit,
                totalCost: input.totalCost,
                notes: input.notes?.trim() || null,
                receivedBy: auth.staff.id,
                receivedByName: staffName,
            })
            .returning();

        await tx
            .update(ingredients)
            .set({ currentStock: newStock, avgCostPerUnit: newAvg, updatedAt: new Date() })
            .where(eq(ingredients.id, locked.id));

        await tx.insert(stockMovements).values({
            tenantId: auth.staff.tenantId,
            branchId: locked.branchId,
            ingredientId: locked.id,
            reason: "purchase",
            quantityChange: quantity,
            costImpact: input.totalCost,
            receiptId: receipt.id,
            notes: input.notes?.trim() || null,
            createdBy: auth.staff.id,
            createdByName: staffName,
            stockBeforeMovement: oldStock,
            avgCostBeforeMovement: locked.avgCostPerUnit,
        });

        return { receipt, ingredient: locked, newStock, newAvg } as const;
    });

    if ("error" in result) return { data: null, error: result.error };

    await logAudit(db, auth.staff, "stock_movement", result.receipt.id, "create", {
        branchId: result.receipt.branchId,
        newValue: result.receipt,
        description: `received ${quantity} ${result.ingredient.unit} of "${result.ingredient.name}"`,
    });

    return { data: result.receipt };
}

export async function getStockReceiptsAction(input?: {
    branchId?: string;
    ingredientId?: string;
    limit?: number;
}) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const branch = resolveBranchId(auth.staff, input?.branchId);
    const branchIdFilter = branch.ok ? branch.branchId : undefined;
    const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);

    const rows = await db
        .select({
            receipt: stockReceipts,
            ingredientName: ingredients.name,
            unit: ingredients.unit,
            supplierName: suppliers.name,
        })
        .from(stockReceipts)
        .innerJoin(ingredients, eq(ingredients.id, stockReceipts.ingredientId))
        .leftJoin(suppliers, eq(suppliers.id, stockReceipts.supplierId))
        .where(
            and(
                eq(stockReceipts.tenantId, auth.staff.tenantId),
                branchIdFilter ? eq(stockReceipts.branchId, branchIdFilter) : undefined,
                input?.ingredientId ? eq(stockReceipts.ingredientId, input.ingredientId) : undefined
            )
        )
        .orderBy(desc(stockReceipts.createdAt))
        .limit(limit);

    return { data: rows };
}

// ── Manual adjustments (wastage / count correction / other) ───────────────

export type AdjustStockInput =
    // Spoiled/dropped/expired stock. Quantity is a positive amount to remove.
    | { kind: "wastage"; ingredientId: string; quantity: number; notes?: string }
    // Physical stock count: staff enter what's actually on the shelf and the
    // system works out the difference.
    | { kind: "count"; ingredientId: string; countedStock: number; notes?: string }
    // Anything else. Signed (+ adds, - removes), reason in notes is required.
    | { kind: "other"; ingredientId: string; quantityChange: number; notes: string };

export async function adjustStockAction(input: AdjustStockInput) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    if (input.kind === "wastage") {
        if (!Number.isFinite(input.quantity) || round3(input.quantity) <= 0) {
            return { data: null, error: "Wastage quantity must be greater than 0." };
        }
    } else if (input.kind === "count") {
        if (!Number.isFinite(input.countedStock) || round3(input.countedStock) < 0) {
            return { data: null, error: "Counted stock can't be negative." };
        }
    } else if (input.kind === "other") {
        if (!Number.isFinite(input.quantityChange) || round3(input.quantityChange) === 0) {
            return { data: null, error: "Quantity change can't be zero." };
        }
        if (!input.notes.trim()) {
            return { data: null, error: "A note explaining the adjustment is required." };
        }
    } else {
        return { data: null, error: "Invalid adjustment type." };
    }

    const staffName = `${auth.staff.firstName} ${auth.staff.lastName}`;
    const notes = input.notes?.trim() || null;

    const result = await db.transaction(async (tx) => {
        const [locked] = await tx
            .select()
            .from(ingredients)
            .where(
                and(
                    eq(ingredients.id, input.ingredientId),
                    eq(ingredients.tenantId, auth.staff.tenantId)
                )
            )
            .for("update");

        if (!locked || !canAccessBranch(auth.staff, locked.branchId)) {
            return { error: "Ingredient not found." } as const;
        }

        let change: number;
        let reason: StockMovement["reason"];
        if (input.kind === "wastage") {
            change = -round3(input.quantity);
            reason = "wastage";
        } else if (input.kind === "count") {
            change = round3(round3(input.countedStock) - locked.currentStock);
            reason = "correction";
            if (change === 0) {
                return { error: "Counted stock matches the current stock. Nothing to adjust." } as const;
            }
        } else {
            change = round3(input.quantityChange);
            reason = "other";
        }

        const newStock = round3(locked.currentStock + change);
        if (newStock < 0) {
            return {
                error: `Only ${locked.currentStock} ${locked.unit} in stock. Do a stock count first if the records are out of date.`,
            } as const;
        }

        // Signed like quantityChange: negative = value lost from stock.
        const costImpact = Math.round(change * locked.avgCostPerUnit);

        const [movement] = await tx
            .insert(stockMovements)
            .values({
                tenantId: auth.staff.tenantId,
                branchId: locked.branchId,
                ingredientId: locked.id,
                reason,
                quantityChange: change,
                costImpact,
                notes,
                createdBy: auth.staff.id,
                createdByName: staffName,
                stockBeforeMovement: locked.currentStock,
                avgCostBeforeMovement: locked.avgCostPerUnit,
            })
            .returning();

        await tx
            .update(ingredients)
            .set({ currentStock: newStock, updatedAt: new Date() })
            .where(eq(ingredients.id, locked.id));

        return { movement, ingredient: locked, newStock } as const;
    });

    if ("error" in result) return { data: null, error: result.error };

    await logAudit(db, auth.staff, "stock_movement", result.movement.id, "create", {
        branchId: result.movement.branchId,
        newValue: result.movement,
        description: `${result.movement.reason}: ${result.movement.quantityChange > 0 ? "+" : ""}${result.movement.quantityChange} ${result.ingredient.unit} of "${result.ingredient.name}"`,
    });

    return { data: result.movement };
}

// ── Edit most-recent movement ──────────────────────────────────────────────

/**
 * Only the ingredient's single most-recent stock_movements row is editable,
 * and only if it was created after migration 0035 (has a before-snapshot).
 * Sale movements (auto-deducted from orders) can never be edited here.
 *
 * `quantity` means: purchase = qty received, wastage = qty removed (both
 * positive). `quantityChange` is used instead for correction/other, since
 * those are already signed in the ledger. `totalCost` is required (and only
 * used) for purchase edits, and also patches the linked stock_receipts row.
 */
export async function editMostRecentStockMovementAction(
    movementId: string,
    input: { quantity?: number; quantityChange?: number; totalCost?: number }
) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const result = await db.transaction(async (tx) => {
        const [movement] = await tx
            .select()
            .from(stockMovements)
            .where(
                and(
                    eq(stockMovements.id, movementId),
                    eq(stockMovements.tenantId, auth.staff.tenantId)
                )
            )
            .for("update");

        if (!movement || !canAccessBranch(auth.staff, movement.branchId)) {
            return { error: "Stock movement not found." } as const;
        }
        if (movement.reason === "sale") {
            return { error: "Sale entries are generated automatically and can't be edited." } as const;
        }
        if (movement.stockBeforeMovement === null || movement.avgCostBeforeMovement === null) {
            return { error: "This entry predates edit support and can't be edited." } as const;
        }

        const [locked] = await tx
            .select()
            .from(ingredients)
            .where(eq(ingredients.id, movement.ingredientId))
            .for("update");
        if (!locked) return { error: "Ingredient not found." } as const;

        const [mostRecent] = await tx
            .select({ id: stockMovements.id })
            .from(stockMovements)
            .where(eq(stockMovements.ingredientId, movement.ingredientId))
            .orderBy(desc(stockMovements.createdAt))
            .limit(1);
        if (!mostRecent || mostRecent.id !== movement.id) {
            return { error: "Only the most recent entry for an ingredient can be edited." } as const;
        }

        const stockBefore = movement.stockBeforeMovement;
        const avgCostBefore = movement.avgCostBeforeMovement;

        let newQuantityChange: number;
        let newCostImpact: number;
        let newAvg = locked.avgCostPerUnit;

        if (movement.reason === "purchase") {
            const quantity = round3(input.quantity ?? NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                return { error: "Quantity must be greater than 0." } as const;
            }
            if (input.totalCost === undefined || !Number.isInteger(input.totalCost) || input.totalCost < 0) {
                return { error: "Total cost must be a whole number of rupees (0 or more)." } as const;
            }
            const newStock = round3(stockBefore + quantity);
            const costPerUnit = Math.round(input.totalCost / quantity);
            newAvg =
                stockBefore <= 0
                    ? costPerUnit
                    : Math.round((stockBefore * avgCostBefore + input.totalCost) / newStock);
            newQuantityChange = quantity;
            newCostImpact = input.totalCost;

            if (movement.receiptId) {
                await tx
                    .update(stockReceipts)
                    .set({ quantity, costPerUnit, totalCost: input.totalCost })
                    .where(eq(stockReceipts.id, movement.receiptId));
            }
        } else if (movement.reason === "wastage") {
            const quantity = round3(input.quantity ?? NaN);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                return { error: "Wastage quantity must be greater than 0." } as const;
            }
            newQuantityChange = -quantity;
            newCostImpact = Math.round(newQuantityChange * avgCostBefore);
        } else {
            const change = round3(input.quantityChange ?? NaN);
            if (!Number.isFinite(change) || change === 0) {
                return { error: "Quantity change can't be zero." } as const;
            }
            newQuantityChange = change;
            newCostImpact = Math.round(newQuantityChange * avgCostBefore);
        }

        const newStock = round3(stockBefore + newQuantityChange);
        if (newStock < 0) {
            return {
                error: `That change would take stock below 0 (this entry started at ${stockBefore} ${locked.unit}).`,
            } as const;
        }

        const [updatedMovement] = await tx
            .update(stockMovements)
            .set({ quantityChange: newQuantityChange, costImpact: newCostImpact })
            .where(eq(stockMovements.id, movement.id))
            .returning();

        await tx
            .update(ingredients)
            .set({ currentStock: newStock, avgCostPerUnit: newAvg, updatedAt: new Date() })
            .where(eq(ingredients.id, locked.id));

        return { before: movement, after: updatedMovement, ingredient: locked } as const;
    });

    if ("error" in result) return { data: null, error: result.error };

    await logAudit(db, auth.staff, "stock_movement", result.after.id, "update", {
        branchId: result.after.branchId,
        oldValue: result.before,
        newValue: result.after,
        description: `edited ${result.after.reason} entry for "${result.ingredient.name}"`,
    });

    return { data: result.after };
}

export async function getStockMovementsAction(input?: {
    branchId?: string;
    ingredientId?: string;
    reason?: StockMovement["reason"];
    limit?: number;
}) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const branch = resolveBranchId(auth.staff, input?.branchId);
    const branchIdFilter = branch.ok ? branch.branchId : undefined;
    const limit = Math.min(Math.max(input?.limit ?? 100, 1), 500);

    const rows = await db
        .select({
            movement: stockMovements,
            ingredientName: ingredients.name,
            unit: ingredients.unit,
            supplierName: suppliers.name,
        })
        .from(stockMovements)
        .innerJoin(ingredients, eq(ingredients.id, stockMovements.ingredientId))
        .leftJoin(stockReceipts, eq(stockReceipts.id, stockMovements.receiptId))
        .leftJoin(suppliers, eq(suppliers.id, stockReceipts.supplierId))
        .where(
            and(
                eq(stockMovements.tenantId, auth.staff.tenantId),
                branchIdFilter ? eq(stockMovements.branchId, branchIdFilter) : undefined,
                input?.ingredientId ? eq(stockMovements.ingredientId, input.ingredientId) : undefined,
                input?.reason ? eq(stockMovements.reason, input.reason) : undefined
            )
        )
        .orderBy(desc(stockMovements.createdAt))
        .limit(limit);

    return { data: rows };
}

// ── Recipes (BOM) ─────────────────────────────────────────────────────────

export interface RecipeLineInput {
    ingredientId: string;
    // null/undefined = used for every variant of the item.
    menuItemVariantId?: string | null;
    quantityPerUnit: number;
}

export async function getRecipeAction(menuItemId: string) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const item = await db.query.menuItems.findFirst({
        where: and(eq(menuItems.id, menuItemId), eq(menuItems.tenantId, auth.staff.tenantId)),
    });
    if (!item || !canAccessBranch(auth.staff, item.branchId)) {
        return { data: null, error: "Menu item not found." };
    }

    const rows = await db
        .select({
            id: recipeIngredients.id,
            ingredientId: recipeIngredients.ingredientId,
            ingredientName: ingredients.name,
            unit: ingredients.unit,
            avgCostPerUnit: ingredients.avgCostPerUnit,
            menuItemVariantId: recipeIngredients.menuItemVariantId,
            variantName: menuItemVariants.name,
            quantityPerUnit: recipeIngredients.quantityPerUnit,
        })
        .from(recipeIngredients)
        .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
        .leftJoin(menuItemVariants, eq(menuItemVariants.id, recipeIngredients.menuItemVariantId))
        .where(
            and(
                eq(recipeIngredients.menuItemId, menuItemId),
                eq(recipeIngredients.tenantId, auth.staff.tenantId)
            )
        )
        .orderBy(asc(ingredients.name));

    const data = rows.map((r) => ({
        ...r,
        // Current cost of this line at the ingredient's running average.
        lineCost: Math.round(r.quantityPerUnit * r.avgCostPerUnit),
    }));

    return { data };
}

/**
 * Replaces the item's whole recipe with the given lines (empty array clears
 * it). Replace-all, not per-line CRUD: the editor saves one form, and it
 * avoids the unique constraint's blind spot (NULL variant ids never collide
 * in Postgres, so it can't stop duplicate "all variants" rows on its own).
 */
export async function setRecipeAction(menuItemId: string, lines: RecipeLineInput[]) {
    const auth = await requireInventoryAccess();
    if (!auth.ok) return { data: null, error: auth.error };

    const item = await db.query.menuItems.findFirst({
        where: and(eq(menuItems.id, menuItemId), eq(menuItems.tenantId, auth.staff.tenantId)),
    });
    if (!item || !canAccessBranch(auth.staff, item.branchId)) {
        return { data: null, error: "Menu item not found." };
    }

    const cleaned = lines.map((l) => ({
        ingredientId: l.ingredientId,
        menuItemVariantId: l.menuItemVariantId ?? null,
        quantityPerUnit: round3(l.quantityPerUnit),
    }));

    for (const l of cleaned) {
        if (!Number.isFinite(l.quantityPerUnit) || l.quantityPerUnit <= 0) {
            return { data: null, error: "Every quantity must be greater than 0." };
        }
    }

    // Duplicates + ambiguity: the same ingredient can't appear twice for the
    // same variant, and can't be both "all variants" and variant-specific
    // (it would be unclear which amount wins at sale time).
    const seen = new Set<string>();
    const variantsByIngredient = new Map<string, Set<string | null>>();
    for (const l of cleaned) {
        const key = `${l.menuItemVariantId ?? "all"}:${l.ingredientId}`;
        if (seen.has(key)) return { data: null, error: "An ingredient is listed twice for the same variant." };
        seen.add(key);
        const set = variantsByIngredient.get(l.ingredientId) ?? new Set<string | null>();
        set.add(l.menuItemVariantId);
        variantsByIngredient.set(l.ingredientId, set);
    }
    for (const set of variantsByIngredient.values()) {
        if (set.has(null) && set.size > 1) {
            return {
                data: null,
                error: "An ingredient can't be both 'all variants' and variant-specific. Pick one.",
            };
        }
    }

    // Ingredients must belong to the same branch as the menu item.
    const ingredientIds = [...variantsByIngredient.keys()];
    if (ingredientIds.length > 0) {
        const found = await db.query.ingredients.findMany({
            where: and(
                inArray(ingredients.id, ingredientIds),
                eq(ingredients.tenantId, auth.staff.tenantId),
                eq(ingredients.branchId, item.branchId)
            ),
        });
        if (found.length !== ingredientIds.length) {
            return { data: null, error: "One or more ingredients aren't available in this menu item's branch." };
        }
    }

    // Variants must belong to this menu item.
    const variantIds = [
        ...new Set(cleaned.map((l) => l.menuItemVariantId).filter((v): v is string => v !== null)),
    ];
    if (variantIds.length > 0) {
        const foundVariants = await db.query.menuItemVariants.findMany({
            where: and(
                inArray(menuItemVariants.id, variantIds),
                eq(menuItemVariants.menuItemId, menuItemId)
            ),
        });
        if (foundVariants.length !== variantIds.length) {
            return { data: null, error: "One or more variants don't belong to this menu item." };
        }
    }

    const before = await db.query.recipeIngredients.findMany({
        where: and(
            eq(recipeIngredients.menuItemId, menuItemId),
            eq(recipeIngredients.tenantId, auth.staff.tenantId)
        ),
    });

    const inserted = await db.transaction(async (tx) => {
        await tx.delete(recipeIngredients).where(eq(recipeIngredients.menuItemId, menuItemId));
        if (cleaned.length === 0) return [];
        return tx
            .insert(recipeIngredients)
            .values(
                cleaned.map((l) => ({
                    tenantId: auth.staff.tenantId,
                    menuItemId,
                    menuItemVariantId: l.menuItemVariantId,
                    ingredientId: l.ingredientId,
                    quantityPerUnit: l.quantityPerUnit,
                }))
            )
            .returning();
    });

    await logAudit(db, auth.staff, "recipe", menuItemId, "update", {
        branchId: item.branchId,
        oldValue: { lines: before },
        newValue: { lines: inserted },
        description: `updated recipe for "${item.name}" (${inserted.length} ingredient line${inserted.length === 1 ? "" : "s"})`,
    });

    return { data: inserted };
}