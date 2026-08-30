"use server";

import { db } from "@/db";
import {
    orders,
    orderItems,
    orderCounters,
    orderDiscounts,
    coupons,
    couponBranchAllocations,
    tenantSettings,
    menuItems,
    menuCategories,
    staff,
    restaurantTables,
    tableReservations,
    payments,
    deliveries,
} from "@/db/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { eq, and, inArray, sql } from "drizzle-orm";
import type { Order, OrderStatus, OrderType } from "@/types";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { logAudit } from "@/lib/audit";
import { getOfflineRef } from "@/features/orders/lib/printKitchenTicket";
import { broadcastChange } from "@/lib/realtime/broadcast";
import { createNotification } from "../notifications/actions";

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
    couponId?: string;
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

function buildOrderResponse(
    order: typeof orders.$inferSelect,
    items: (typeof orderItems.$inferSelect)[],
    tableNumber?: string,
    discounts: (typeof orderDiscounts.$inferSelect)[] = []
): Order {
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        tableId: order.tableId ?? undefined,
        customerPhone: order.customerPhone ?? undefined,
        orderType: order.orderType,
        status: order.status,
        tableNumber,
        wasOfflineOrder: order.wasOfflineOrder,
        offlineRef: order.wasOfflineOrder && order.idempotencyKey ? getOfflineRef(order.idempotencyKey) : undefined,
        items: items.map((i) => ({
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
        subtotal: order.subtotal,
        discounts: discounts.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            value: d.value,
            appliedAmount: d.appliedAmount,
            appliedBy: d.appliedBy,
            appliedByName: d.appliedByName,
        })),
        totalDiscount: order.totalDiscount,
        deliveryFee: order.deliveryFee,
        total: order.total,
        paymentStatus: order.paymentStatus,
        payments: [],
        totalPaid: order.totalPaid,
        balance: order.total - order.totalPaid,
        deliveryAddress: order.deliveryAddress ?? undefined,
        notes: order.notes ?? undefined,
        staffId: order.staffId,
        staffName: order.staffName,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
    };
}

// ─── Create Order ───────────────────────────────────────────────────────

export async function createOrderAction(
    input: CreateOrderInput,
    targetBranchId?: string,
    idempotencyKey?: string,
    queuedAt?: Date,
    wasOfflineOrder: boolean = false
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

    console.time("[createOrderAction] total");

    // Idempotency check — if this exact order attempt already succeeded
    // (e.g. the client timed out waiting but the request actually landed,
    // or a background retry from an offline client duplicated the call),
    // return the existing order instead of creating a duplicate.
    if (idempotencyKey) {
        const existing = await db.query.orders.findFirst({
            where: and(
                eq(orders.tenantId, currentStaffRow.tenantId),
                eq(orders.idempotencyKey, idempotencyKey)
            ),
            with: { items: true, table: true, discounts: true },
        });
        if (existing) {
            return {
                success: true,
                order: buildOrderResponse(existing, existing.items, existing.table?.tableNumber, existing.discounts),
            };
        }
    }

    try {
        console.time("[createOrderAction] transaction");
        const result = await db.transaction(async (tx) => {
            // ── 1. Fetch real menu items for every line in the cart ──────
            // Runs in parallel with the table lookup below — independent
            // queries, no reason to wait for one before starting the other.
            const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
            const [realMenuItems, preloadedTable] = await Promise.all([
                tx.query.menuItems.findMany({
                    where: and(
                        inArray(menuItems.id, menuItemIds),
                        eq(menuItems.tenantId, currentStaffRow.tenantId),
                        eq(menuItems.branchId, branchId)
                    ),
                    with: {
                        variants: true,
                        modifierGroups: { with: { options: true } },
                    },
                }),
                input.tableId
                    ? tx.query.restaurantTables.findFirst({
                          where: eq(restaurantTables.id, input.tableId),
                      })
                    : Promise.resolve(null),
            ]);

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
                where: inArray(menuCategories.id, categoryIds),
            });
            const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
            for (const item of builtItems) {
                item.categoryName = categoryNameMap.get(item.categoryId) ?? "Uncategorized";
            }

            // ── 4. Compute totals server-side ─────────────────────────────
            const subtotal = builtItems.reduce((sum, i) => sum + i.itemTotal, 0);

            // Coupon validation happens entirely server-side, inside the
            // transaction, against live data — the client only ever sends
            // a couponId, never a discount amount. Fetching the coupon here
            // (not before the transaction) means its usesCount check and
            // later increment happen under the same transaction, closing
            // the window for two concurrent orders to both redeem the last
            // use of a maxUses-limited coupon.
            let appliedCoupon: typeof coupons.$inferSelect | null = null;
            let totalDiscount = 0;

            if (input.couponId) {
                const now = new Date();

                const settings = await tx.query.tenantSettings.findFirst({
                    where: eq(tenantSettings.tenantId, currentStaffRow.tenantId),
                });
                if (settings && settings.posAllowDiscounts === false) {
                    throw new Error("Discounts are currently disabled for this restaurant.");
                }

                const coupon = await tx.query.coupons.findFirst({
                    where: and(
                        eq(coupons.id, input.couponId),
                        eq(coupons.tenantId, currentStaffRow.tenantId)
                    ),
                });

                if (!coupon) {
                    throw new Error("Coupon not found.");
                }
                if (!coupon.isActive) {
                    throw new Error(`Coupon "${coupon.name}" is no longer active.`);
                }
                if (coupon.validFrom && coupon.validFrom > now) {
                    throw new Error(`Coupon "${coupon.name}" is not valid yet.`);
                }
                if (coupon.validTo && coupon.validTo < now) {
                    throw new Error(`Coupon "${coupon.name}" has expired.`);
                }
                if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
                    throw new Error(`Coupon "${coupon.name}" has reached its usage limit.`);
                }
                if (coupon.branchIds && !coupon.branchIds.includes(branchId)) {
                    throw new Error(`Coupon "${coupon.name}" is not valid at this branch.`);
                }

                if (coupon.menuItemIds || coupon.categoryIds) {
                    const eligibleSubtotal = builtItems.reduce((sum, i) => {
                        const itemEligible =
                            (coupon.menuItemIds?.includes(i.menuItemId) ?? false) ||
                            (coupon.categoryIds?.includes(i.categoryId) ?? false);
                        return itemEligible ? sum + i.itemTotal : sum;
                    }, 0);
                    if (eligibleSubtotal === 0) {
                        throw new Error(`Coupon "${coupon.name}" doesn't apply to any items in this order.`);
                    }
                    totalDiscount =
                        coupon.discountType === "percentage"
                            ? Math.round(eligibleSubtotal * (Math.min(coupon.discountValue, 100) / 100))
                            : Math.min(coupon.discountValue, eligibleSubtotal);
                } else {
                    totalDiscount =
                        coupon.discountType === "percentage"
                            ? Math.round(subtotal * (Math.min(coupon.discountValue, 100) / 100))
                            : Math.min(coupon.discountValue, subtotal);
                }

                appliedCoupon = coupon;
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
                tableNumber = preloadedTable?.tableNumber;

                // Independent of each other — run together instead of one after another.
                await Promise.all([
                    tx
                        .update(restaurantTables)
                        .set({ status: "occupied", updatedAt: new Date() })
                        .where(eq(restaurantTables.id, input.tableId)),
                    // If this table had an open reservation, seating an order
                    // against it resolves that reservation automatically —
                    // staff aren't required to hit a separate "seat" button.
                    tx
                        .update(tableReservations)
                        .set({ status: "seated", updatedAt: new Date() })
                        .where(
                            and(
                                eq(tableReservations.tableId, input.tableId),
                                inArray(tableReservations.status, ["pending", "confirmed"])
                            )
                        ),
                ]);
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
                    staffName: `${currentStaffRow.firstName} ${currentStaffRow.lastName}`,
                    idempotencyKey: idempotencyKey ?? null,
                    wasOfflineOrder,
                    // Offline orders pass their true placement time so the
                    // kitchen ticket and Orders page reflect when the order
                    // actually happened, not when it happened to sync.
                    ...(queuedAt ? { createdAt: queuedAt } : {}),
                })
                .returning();

            if (input.orderType === "delivery") {
                await tx.insert(deliveries).values({
                    tenantId: currentStaffRow.tenantId,
                    branchId,
                    orderId: createdOrder.id,
                    riderId: null,
                    status: "unassigned",
                    deliveryAddress: {
                        label: null,
                        street: input.deliveryAddress ?? "",
                        area: "",
                        city: "",
                        instructions: null,
                    },
                    deliveryFee,
                });
            }

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

            let insertedDiscounts: (typeof orderDiscounts.$inferSelect)[] = [];
            if (appliedCoupon) {
                const [discountRows] = await Promise.all([
                    tx
                        .insert(orderDiscounts)
                        .values({
                            tenantId: currentStaffRow.tenantId,
                            orderId: createdOrder.id,
                            name: appliedCoupon.name,
                            type: appliedCoupon.discountType,
                            value: appliedCoupon.discountValue,
                            appliedAmount: totalDiscount,
                            appliedBy: currentStaffRow.id,
                            appliedByName: `${currentStaffRow.firstName} ${currentStaffRow.lastName}`,
                            couponId: appliedCoupon.id,
                        })
                        .returning(),
                    tx
                        .update(coupons)
                        .set({ usesCount: sql`${coupons.usesCount} + 1`, updatedAt: new Date() })
                        .where(eq(coupons.id, appliedCoupon.id)),
                    // No-ops harmlessly if this coupon has no per-branch
                    // allocation row (single-branch or uncapped coupons).
                    tx
                        .update(couponBranchAllocations)
                        .set({ usedCount: sql`${couponBranchAllocations.usedCount} + 1` })
                        .where(
                            and(
                                eq(couponBranchAllocations.couponId, appliedCoupon.id),
                                eq(couponBranchAllocations.branchId, branchId)
                            )
                        ),
                ]);
                insertedDiscounts = discountRows;
            }

            return { order: createdOrder, items: insertedItems, discounts: insertedDiscounts, tableNumber };
        });
        console.timeEnd("[createOrderAction] transaction");

        console.time("[createOrderAction] audit+broadcast");
        const auditPromises = [
            logAudit(db, currentStaffRow, "order", result.order.id, "create", {
                branchId: result.order.branchId,
                newValue: {
                    orderNumber: result.order.orderNumber,
                    orderType: result.order.orderType,
                    total: result.order.total,
                    tableNumber: result.tableNumber,
                },
            }),
        ];

        const broadcastPromises = [
            broadcastChange(result.order.branchId, "orders"),
            createNotification({
                tenantId: result.order.tenantId,
                branchId: result.order.branchId,
                type: "order_new",
                title: "New order",
                message: `Order ${result.order.orderNumber} placed (${result.order.orderType}).`,
                resourceType: "order",
                resourceId: result.order.id,
            }),
        ];
        if (input.tableId) {
            broadcastPromises.push(broadcastChange(result.order.branchId, "tables"));
        }

        await Promise.all([...auditPromises, ...broadcastPromises]);

        console.timeEnd("[createOrderAction] audit+broadcast");
        console.timeEnd("[createOrderAction] total");

        return {
            success: true,
            order: buildOrderResponse(result.order, result.items, result.tableNumber, result.discounts),
        };
    } catch (err) {
        const pgErr = err as { code?: string };
        if (idempotencyKey && pgErr.code === "23505") {
            // Concurrent duplicate — another request with the same
            // idempotency key won the race and inserted first, after our
            // pre-check above already passed. This is the safety net for
            // that narrow window, not the primary defense.
            const existing = await db.query.orders.findFirst({
                where: and(
                    eq(orders.tenantId, currentStaffRow.tenantId),
                    eq(orders.idempotencyKey, idempotencyKey)
                ),
                with: { items: true, table: true, discounts: true },
            });
            if (existing) {
                return {
                    success: true,
                    order: buildOrderResponse(existing, existing.items, existing.table?.tableNumber, existing.discounts),
                };
            }
        }
        return { error: `Failed to create order: ${(err as Error).message}` };
    }
}

// ─── Read Orders ─────────────────────────────────────────────────────────

export interface GetOrdersFilters {
    statuses?: OrderStatus[];
    dateFrom?: string; // ISO string
    dateTo?: string; // ISO string
}

const MAX_ORDERS_RETURNED = 500;

export async function getOrdersAction(
    overrideBranchId?: string,
    filters?: GetOrdersFilters
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
        where: (o, { eq: eqOp, and: andOp, inArray: inArrayOp, gte: gteOp, lte: lteOp }) =>
            andOp(
                eqOp(o.tenantId, tenantId),
                branchId ? eqOp(o.branchId, branchId) : undefined,
                filters?.statuses?.length ? inArrayOp(o.status, filters.statuses) : undefined,
                filters?.dateFrom ? gteOp(o.createdAt, new Date(filters.dateFrom)) : undefined,
                filters?.dateTo ? lteOp(o.createdAt, new Date(filters.dateTo)) : undefined
            ),
        with: {
            items: true,
            discounts: true,
            payments: true,
            table: true,
        },
        orderBy: (o, { desc }) => [desc(o.createdAt)],
        limit: MAX_ORDERS_RETURNED,
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
        wasOfflineOrder: o.wasOfflineOrder,
        offlineRef: o.wasOfflineOrder && o.idempotencyKey ? getOfflineRef(o.idempotencyKey) : undefined,
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
            appliedByName: d.appliedByName,
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
            processedByName: p.processedByName,
        })),
        totalPaid: o.totalPaid,
        balance: o.balance,
        deliveryAddress: o.deliveryAddress ?? undefined,
        estimatedDeliveryMinutes: o.estimatedDeliveryMinutes ?? undefined,
        notes: o.notes ?? undefined,
        staffId: o.staffId,
        staffName: o.staffName,
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
            rider: true,
            delivery: true,
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
            riderId: row.riderId ?? undefined,
            riderName: row.rider ? `${row.rider.firstName} ${row.rider.lastName}` : undefined,
            deliveryStatus: row.delivery?.status ?? undefined,
            customerPhone: row.customerPhone ?? undefined,
            orderType: row.orderType,
            status: row.status,
            wasOfflineOrder: row.wasOfflineOrder,
            offlineRef: row.wasOfflineOrder && row.idempotencyKey ? getOfflineRef(row.idempotencyKey) : undefined,
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
                appliedByName: d.appliedByName,
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
                processedByName: p.processedByName,
            })),
            totalPaid: row.totalPaid,
            balance: row.balance,
            deliveryAddress: row.deliveryAddress ?? undefined,
            estimatedDeliveryMinutes: row.estimatedDeliveryMinutes ?? undefined,
            notes: row.notes ?? undefined,
            staffId: row.staffId,
            staffName: row.staffName,
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

    await logAudit(db, currentStaffRow, "order", orderId, "status_change", {
        branchId: target.branchId,
        oldValue: { status: target.status },
        newValue: { status: "confirmed", orderNumber: target.orderNumber },
    });

    await broadcastChange(target.branchId, "orders");

    return { success: true };
}

// ─── Complete Bill (mark paid) ──────────────────────────────────────────

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

    if (target.orderType === "delivery") {
        const delivery = await db.query.deliveries.findFirst({ where: eq(deliveries.orderId, orderId) });
        if (!delivery || delivery.status !== "delivered") {
            return { error: "This delivery hasn't been marked delivered by the rider yet." };
        }
    }

    let paymentId = "";

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

        const [payment] = await tx.insert(payments).values({
            tenantId: currentStaffRow.tenantId,
            orderId,
            method: paymentMethod,
            amount: target.total,
            processedBy: currentStaffRow.id,
            processedByName: `${currentStaffRow.firstName} ${currentStaffRow.lastName}`,
        }).returning();

        paymentId = payment.id;

        // Free up the table now that the order is done
        if (target.tableId) {
            await tx
                .update(restaurantTables)
                .set({ status: "available", updatedAt: now })
                .where(eq(restaurantTables.id, target.tableId));
        }
    });

    await logAudit(db, currentStaffRow, "order", orderId, "status_change", {
        branchId: target.branchId,
        oldValue: { status: target.status, paymentStatus: target.paymentStatus },
        newValue: { status: "completed", paymentStatus: "paid", paymentMethod, amount: target.total, orderNumber: target.orderNumber },
    });

    await logAudit(db, currentStaffRow, "payment", paymentId, "create", {
        branchId: target.branchId,
        newValue: { orderId, method: paymentMethod, amount: target.total, orderNumber: target.orderNumber },
    });

    await broadcastChange(target.branchId, "orders");
    if (target.tableId) {
        await broadcastChange(target.branchId, "tables");
    }

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

    await logAudit(db, currentStaffRow, "order", orderId, "status_change", {
        branchId: target.branchId,
        oldValue: { status: target.status },
        newValue: { status: "cancelled", orderNumber: target.orderNumber },
    });

    await broadcastChange(target.branchId, "orders");
    if (target.tableId) {
        await broadcastChange(target.branchId, "tables");
    }

    return { success: true };
}


