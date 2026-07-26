"use server";

import { db } from "@/db";
import {
    orders,
    orderItems,
    orderCounters,
    menuItems,
    staff,
    restaurantTables,
    payments,
} from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and, inArray, sql } from "drizzle-orm";
import type { Order, OrderType } from "@/types";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

// ─── Input shape ────────────────────────────────────────────────────────

export interface CreateOrderItemInput {
    menuItemId: string;
    variantId?: string;
    modifierOptionIds: string[];
    quantity: number;
    notes?: string;
}

export interface CreateOrderInput {
    orderType: OrderType;
    tableId?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    discountType?: "percentage" | "fixed";
    discountValue?: number;
    notes?: string;
    items: CreateOrderItemInput[];
}

// ─── Shared auth helper (same pattern as menu actions) ────────────────

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

// ─── Create Order ───────────────────────────────────────────────────────

export async function createOrderAction(
    input: CreateOrderInput,
    targetBranchId?: string
): Promise<{ success: true; order: Order } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    if (!["STAFF", "ADMIN", "SUPER_ADMIN"].includes(currentStaffRow.role)) {
        return { error: "You don't have permission to create orders." };
    }

    // Resolve branch — STAFF/ADMIN locked to their own, SUPER_ADMIN must specify
    let branchId: string;
    if (currentStaffRow.role === "SUPER_ADMIN") {
        if (!targetBranchId) {
            return { error: "Select a branch before creating an order." };
        }
        branchId = targetBranchId;
    } else {
        if (!currentStaffRow.branchId) {
            return { error: "Your account has no branch assigned." };
        }
        branchId = currentStaffRow.branchId;
    }

    if (input.items.length === 0) {
        return { error: "Cannot create an order with no items." };
    }

    try {
        const result = await db.transaction(async (tx) => {
            // ── 1. Fetch real menu items for every line in the cart ──────
            const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
            const realMenuItems = await tx.query.menuItems.findMany({
                where: and(
                    inArray(menuItems.id, menuItemIds),
                    eq(menuItems.tenantId, currentStaffRow.tenantId),
                    eq(menuItems.branchId, branchId)
                ),
                with: {
                    variants: true,
                    modifierGroups: { with: { options: true } },
                },
            });

            const menuItemMap = new Map(realMenuItems.map((m) => [m.id, m]));

            // ── 2. Build each order item from real DB prices ─────────────
            const builtItems = input.items.map((line) => {
                const menuItem = menuItemMap.get(line.menuItemId);
                if (!menuItem) {
                    throw new Error(`Menu item not found or unavailable: ${line.menuItemId}`);
                }
                if (menuItem.status !== "available") {
                    throw new Error(`"${menuItem.name}" is not currently available.`);
                }

                let unitPrice = menuItem.basePrice;
                let selectedVariant = null;

                if (line.variantId) {
                    const variant = menuItem.variants.find((v) => v.id === line.variantId);
                    if (!variant) throw new Error(`Invalid variant for "${menuItem.name}".`);
                    unitPrice = variant.price;
                    selectedVariant = {
                        variantId: variant.id,
                        variantName: variant.name,
                        priceAdjustment: 0,
                    };
                }

                const allOptions = menuItem.modifierGroups.flatMap((g) =>
                    g.options.map((o) => ({ ...o, groupId: g.id, groupName: g.name }))
                );
                const selectedModifiers = line.modifierOptionIds.map((optId) => {
                    const opt = allOptions.find((o) => o.id === optId);
                    if (!opt) throw new Error(`Invalid modifier option for "${menuItem.name}".`);
                    unitPrice += opt.priceAdjustment;
                    return {
                        groupId: opt.groupId,
                        groupName: opt.groupName,
                        optionId: opt.id,
                        optionName: opt.name,
                        priceAdjustment: opt.priceAdjustment,
                    };
                });

                const itemTotal = unitPrice * line.quantity;

                return {
                    menuItemId: menuItem.id,
                    menuItemName: menuItem.name,
                    menuItemImage: menuItem.image ?? null,
                    categoryId: menuItem.categoryId,
                    categoryName: "", // filled below
                    quantity: line.quantity,
                    unitPrice,
                    itemTotal,
                    selectedVariant,
                    selectedModifiers,
                    notes: line.notes ?? null,
                };
            });

            // ── 3. Look up category names for the snapshot ───────────────
            const categoryIds = [...new Set(builtItems.map((i) => i.categoryId))];
            const categories = await tx.query.menuCategories.findMany({
                where: inArray(
                    (await import("@/db/schema")).menuCategories.id,
                    categoryIds
                ),
            });
            const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
            for (const item of builtItems) {
                item.categoryName = categoryNameMap.get(item.categoryId) ?? "Uncategorized";
            }

            // ── 4. Compute totals server-side ─────────────────────────────
            const subtotal = builtItems.reduce((sum, i) => sum + i.itemTotal, 0);

            let totalDiscount = 0;
            if (input.discountValue && input.discountValue > 0) {
                if (input.discountType === "percentage") {
                    totalDiscount = Math.round(subtotal * (Math.min(input.discountValue, 100) / 100));
                } else {
                    totalDiscount = Math.min(input.discountValue, subtotal);
                }
            }

            const deliveryFee = input.orderType === "delivery" ? RESTAURANT_CONFIG.defaultDeliveryFee : 0;
            const total = subtotal - totalDiscount + deliveryFee;

            // ── 5. Atomically get next order number for this branch ──────
            // First order for a branch: no row yet, insert starting at 2 —
            // meaning this order is assigned number 1.
            // Every order after: row exists, atomically bump nextNumber by 1
            // and use the value it had *before* the bump. The increment
            // happens as a single UPDATE ... RETURNING under Postgres's own
            // row lock, so two staff submitting orders at the same instant
            // can never receive the same number.
            const [counter] = await tx
                .insert(orderCounters)
                .values({ branchId, tenantId: currentStaffRow.tenantId, nextNumber: 2 })
                .onConflictDoUpdate({
                    target: orderCounters.branchId,
                    set: { nextNumber: sql`${orderCounters.nextNumber} + 1` },
                })
                .returning();

            const orderNumber = `ORD-${String(counter.nextNumber - 1).padStart(4, "0")}`;

            let tableNumber: string | undefined;
            if (input.tableId) {
                const table = await tx.query.restaurantTables.findFirst({
                    where: eq(restaurantTables.id, input.tableId),
                });
                tableNumber = table?.tableNumber;

                await tx
                    .update(restaurantTables)
                    .set({ status: "occupied", updatedAt: new Date() })
                    .where(eq(restaurantTables.id, input.tableId));
            }

            // ── 6. Insert order + items ────────────────────────────────
            const [createdOrder] = await tx
                .insert(orders)
                .values({
                    tenantId: currentStaffRow.tenantId,
                    branchId,
                    orderNumber,
                    tableId: input.tableId ?? null,
                    customerPhone: input.customerPhone ?? null,
                    orderType: input.orderType,
                    status: "pending",
                    subtotal,
                    totalDiscount,
                    deliveryFee,
                    total,
                    deliveryAddress: input.deliveryAddress ?? null,
                    notes: input.notes ?? null,
                    staffId: currentStaffRow.id,
                })
                .returning();

            const insertedItems = await tx
                .insert(orderItems)
                .values(
                    builtItems.map((i) => ({
                        tenantId: currentStaffRow.tenantId,
                        orderId: createdOrder.id,
                        menuItemId: i.menuItemId,
                        menuItemName: i.menuItemName,
                        menuItemImage: i.menuItemImage,
                        categoryId: i.categoryId,
                        categoryName: i.categoryName,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        itemTotal: i.itemTotal,
                        selectedVariant: i.selectedVariant,
                        selectedModifiers: i.selectedModifiers,
                        notes: i.notes,
                    }))
                )
                .returning();

            return { order: createdOrder, items: insertedItems, tableNumber };
        });

        return {
            success: true,
            order: {
                id: result.order.id,
                orderNumber: result.order.orderNumber,
                branchId: result.order.branchId,
                tableId: result.order.tableId ?? undefined,
                customerPhone: result.order.customerPhone ?? undefined,
                orderType: result.order.orderType,
                status: result.order.status,
                tableNumber: result.tableNumber,
                items: result.items.map((i) => ({
                    id: i.id,
                    orderId: i.orderId,
                    menuItemId: i.menuItemId,
                    menuItemName: i.menuItemName,
                    menuItemImage: i.menuItemImage ?? undefined,
                    categoryId: i.categoryId,
                    categoryName: i.categoryName,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    selectedVariant: i.selectedVariant ?? undefined,
                    selectedModifiers: i.selectedModifiers,
                    itemTotal: i.itemTotal,
                    notes: i.notes ?? undefined,
                    status: i.status,
                    createdAt: i.createdAt.toISOString(),
                })),
                subtotal: result.order.subtotal,
                discounts: [],
                totalDiscount: result.order.totalDiscount,
                deliveryFee: result.order.deliveryFee,
                total: result.order.total,
                paymentStatus: result.order.paymentStatus,
                payments: [],
                totalPaid: result.order.totalPaid,
                balance: result.order.total,
                deliveryAddress: result.order.deliveryAddress ?? undefined,
                notes: result.order.notes ?? undefined,
                staffId: result.order.staffId,
                createdAt: result.order.createdAt.toISOString(),
                updatedAt: result.order.updatedAt.toISOString(),
            },
        };
    } catch (err) {
        return { error: `Failed to create order: ${(err as Error).message}` };
    }
}

// ─── Read Orders ─────────────────────────────────────────────────────────

export async function getOrdersAction(
    overrideBranchId?: string
): Promise<{ data: Order[]; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    const { staff: currentStaffRow } = auth;

    const isBranchLocked = currentStaffRow.role === "ADMIN" || currentStaffRow.role === "STAFF";
    if (isBranchLocked && !currentStaffRow.branchId) {
        return { data: null, error: "Your account has no branch assigned." };
    }

    const tenantId = currentStaffRow.tenantId;
    const branchId = isBranchLocked ? currentStaffRow.branchId! : overrideBranchId;

    const rows = await db.query.orders.findMany({
        where: (o, { eq: eqOp, and: andOp }) =>
            andOp(
                eqOp(o.tenantId, tenantId),
                branchId ? eqOp(o.branchId, branchId) : undefined
            ),
        with: {
            items: true,
            discounts: true,
            payments: true,
            table: true,
        },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
    });

    const data: Order[] = rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        branchId: o.branchId,
        tableId: o.tableId ?? undefined,
        tableNumber: o.table?.tableNumber,
        customerPhone: o.customerPhone ?? undefined,
        orderType: o.orderType,
        status: o.status,
        items: o.items.map((i) => ({
            id: i.id,
            orderId: i.orderId,
            menuItemId: i.menuItemId,
            menuItemName: i.menuItemName,
            menuItemImage: i.menuItemImage ?? undefined,
            categoryId: i.categoryId,
            categoryName: i.categoryName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            selectedVariant: i.selectedVariant ?? undefined,
            selectedModifiers: i.selectedModifiers,
            itemTotal: i.itemTotal,
            notes: i.notes ?? undefined,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
        })),
        subtotal: o.subtotal,
        discounts: o.discounts.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            value: d.value,
            appliedAmount: d.appliedAmount,
            appliedBy: d.appliedBy,
        })),
        totalDiscount: o.totalDiscount,
        deliveryFee: o.deliveryFee,
        total: o.total,
        paymentStatus: o.paymentStatus,
        payments: o.payments.map((p) => ({
            id: p.id,
            orderId: p.orderId,
            method: p.method,
            amount: p.amount,
            reference: p.reference ?? undefined,
            processedAt: p.processedAt.toISOString(),
            processedBy: p.processedBy,
        })),
        totalPaid: o.totalPaid,
        balance: o.balance,
        deliveryAddress: o.deliveryAddress ?? undefined,
        estimatedDeliveryMinutes: o.estimatedDeliveryMinutes ?? undefined,
        notes: o.notes ?? undefined,
        staffId: o.staffId,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        completedAt: o.completedAt?.toISOString(),
    }));

    return { data };
}

// ─── Get Single Order ────────────────────────────────────────────────────

export async function getOrderByIdAction(
    orderId: string
): Promise<{ data: Order; error?: undefined } | { data: null; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { data: null, error: auth.error };
    const { staff: currentStaffRow } = auth;

    const row = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
            items: true,
            discounts: true,
            payments: true,
            table: true,
        },
    });

    if (!row || row.tenantId !== currentStaffRow.tenantId) {
        return { data: null, error: "Order not found." };
    }
    if (currentStaffRow.role !== "SUPER_ADMIN" && row.branchId !== currentStaffRow.branchId) {
        return { data: null, error: "You can only view your own branch's orders." };
    }

    return {
        data: {
            id: row.id,
            orderNumber: row.orderNumber,
            branchId: row.branchId,
            tableId: row.tableId ?? undefined,
            tableNumber: row.table?.tableNumber,
            customerPhone: row.customerPhone ?? undefined,
            orderType: row.orderType,
            status: row.status,
            items: row.items.map((i) => ({
                id: i.id,
                orderId: i.orderId,
                menuItemId: i.menuItemId,
                menuItemName: i.menuItemName,
                menuItemImage: i.menuItemImage ?? undefined,
                categoryId: i.categoryId,
                categoryName: i.categoryName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                selectedVariant: i.selectedVariant ?? undefined,
                selectedModifiers: i.selectedModifiers,
                itemTotal: i.itemTotal,
                notes: i.notes ?? undefined,
                status: i.status,
                createdAt: i.createdAt.toISOString(),
            })),
            subtotal: row.subtotal,
            discounts: row.discounts.map((d) => ({
                id: d.id,
                name: d.name,
                type: d.type,
                value: d.value,
                appliedAmount: d.appliedAmount,
                appliedBy: d.appliedBy,
            })),
            totalDiscount: row.totalDiscount,
            deliveryFee: row.deliveryFee,
            total: row.total,
            paymentStatus: row.paymentStatus,
            payments: row.payments.map((p) => ({
                id: p.id,
                orderId: p.orderId,
                method: p.method,
                amount: p.amount,
                reference: p.reference ?? undefined,
                processedAt: p.processedAt.toISOString(),
                processedBy: p.processedBy,
            })),
            totalPaid: row.totalPaid,
            balance: row.balance,
            deliveryAddress: row.deliveryAddress ?? undefined,
            estimatedDeliveryMinutes: row.estimatedDeliveryMinutes ?? undefined,
            notes: row.notes ?? undefined,
            staffId: row.staffId,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            completedAt: row.completedAt?.toISOString(),
        },
    };
}

// ─── Confirm Order (kitchen ticket) ─────────────────────────────────────

export async function confirmOrderAction(
    orderId: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    const target = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Order not found." };
    }
    if (currentStaffRow.role !== "SUPER_ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's orders." };
    }
    if (target.status !== "pending") {
        return { error: `Cannot confirm an order that is already "${target.status}".` };
    }

    await db.update(orders).set({ status: "confirmed", updatedAt: new Date() }).where(eq(orders.id, orderId));
    return { success: true };
}

// ─── Complete Bill (mark paid) ───────────────────────────────────────────

export async function completeBillAction(
    orderId: string,
    paymentMethod: "cash" | "card" | "jazzcash" | "easypaisa" | "bank_transfer" | "complimentary" = "cash"
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    const target = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Order not found." };
    }
    if (currentStaffRow.role !== "SUPER_ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's orders." };
    }
    if (target.status === "completed" || target.status === "cancelled") {
        return { error: `Cannot complete an order that is already "${target.status}".` };
    }

    await db.transaction(async (tx) => {
        const now = new Date();
        await tx
            .update(orders)
            .set({
                status: "completed",
                paymentStatus: "paid",
                totalPaid: target.total,
                balance: 0,
                completedAt: now,
                updatedAt: now,
            })
            .where(eq(orders.id, orderId));

        await tx.insert(payments).values({
            tenantId: currentStaffRow.tenantId,
            orderId,
            method: paymentMethod,
            amount: target.total,
            processedBy: currentStaffRow.id,
        });

        // Free up the table now that the order is done
        if (target.tableId) {
            await tx
                .update(restaurantTables)
                .set({ status: "available", updatedAt: now })
                .where(eq(restaurantTables.id, target.tableId));
        }
    });

    return { success: true };
}

// ─── Cancel Order ────────────────────────────────────────────────────────

export async function cancelOrderAction(
    orderId: string
): Promise<{ success: true } | { success?: undefined; error: string }> {
    const auth = await getCurrentStaff();
    if (!auth.ok) return { error: auth.error };
    const { staff: currentStaffRow } = auth;

    const target = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!target || target.tenantId !== currentStaffRow.tenantId) {
        return { error: "Order not found." };
    }
    if (currentStaffRow.role !== "SUPER_ADMIN" && target.branchId !== currentStaffRow.branchId) {
        return { error: "You can only manage your own branch's orders." };
    }
    if (target.status === "completed" || target.status === "cancelled") {
        return { error: `Cannot cancel an order that is already "${target.status}".` };
    }

    await db.transaction(async (tx) => {
        await tx.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, orderId));

        if (target.tableId) {
            await tx
                .update(restaurantTables)
                .set({ status: "available", updatedAt: new Date() })
                .where(eq(restaurantTables.id, target.tableId));
        }
    });

    return { success: true };
}