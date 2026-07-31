"use server";

import { db } from "@/db";
import {
    orders,
    orderItems,
    orderCounters,
    menuItems,
    menuCategories,
    branches,
    branchDeliveryAreas,
} from "@/db/schema";
import { eq, and, inArray, sql, count, asc } from "drizzle-orm";
import type { Order, MenuCategory, MenuItem } from "@/types";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { getTenantId } from "@/lib/tenant";

// ─── Branch info (drives whether the location modal shows at all) ──────

export async function getPublicBranchInfoAction(): Promise <
    | { data: { branchCount: number; singleBranch?: { id: string; name: string } }; error?: undefined }
    | { data: null; error: string }
> {
    const tenantId = getTenantId();

    const branchRows = await db.query.branches.findMany({
        where: and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)),
    });

    if (branchRows.length === 0) {
        return { data: null, error: "No active branches configured for this restaurant." };
    }

    if (branchRows.length === 1) {
        return {
            data: {
                branchCount: 1,
                singleBranch: { id: branchRows[0].id, name: branchRows[0].name },
            },
        };
    }

    return { data: { branchCount: branchRows.length } };
}

// ─── Delivery areas, grouped for a cascading city → area picker ────────

export async function getPublicDeliveryAreasAction(): Promise <
    | { data: { city: string; areas: { area: string; branchId: string }[] }[]; error?: undefined }
    | { data: null; error: string }
> {
    const tenantId = getTenantId();

    const activeBranches = await db.query.branches.findMany({
        where: and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)),
        columns: { id: true },
    });
    const activeBranchIds = activeBranches.map((b) => b.id);
    if (activeBranchIds.length === 0) {
        return { data: null, error: "No active branches configured for this restaurant." };
    }

    const rows = await db.query.branchDeliveryAreas.findMany({
        where: and(
            eq(branchDeliveryAreas.tenantId, tenantId),
            inArray(branchDeliveryAreas.branchId, activeBranchIds)
        ),
        orderBy: [asc(branchDeliveryAreas.city), asc(branchDeliveryAreas.area)],
    });

    const grouped = new Map<string, { area: string; branchId: string }[]>();
    for (const row of rows) {
        const list = grouped.get(row.city) ?? [];
        list.push({ area: row.area, branchId: row.branchId });
        grouped.set(row.city, list);
    }

    const data = Array.from(grouped.entries()).map(([city, areas]) => ({ city, areas }));
    return { data };
}

// ─── Public menu for a resolved branch ──────────────────────────────────

export async function getPublicMenuAction(
    branchId: string
): Promise <
    | { data: { categories: MenuCategory[]; items: MenuItem[] }; error?: undefined }
    | { data: null; error: string }
> {
    const tenantId = getTenantId();

    const branch = await db.query.branches.findFirst({
        where: and(eq(branches.id, branchId), eq(branches.tenantId, tenantId), eq(branches.isActive, true)),
    });
    if (!branch) return { data: null, error: "This branch is not available." };

    const categoryRows = await db.query.menuCategories.findMany({
        where: and(
            eq(menuCategories.tenantId, tenantId),
            eq(menuCategories.branchId, branchId),
            eq(menuCategories.isActive, true)
        ),
        orderBy: [asc(menuCategories.sortOrder)],
    });

    const itemRows = await db.query.menuItems.findMany({
        where: and(
            eq(menuItems.tenantId, tenantId),
            eq(menuItems.branchId, branchId),
            eq(menuItems.status, "available")
        ),
        orderBy: [asc(menuItems.sortOrder)],
        with: { variants: true, modifierGroups: { with: { options: true } } },
    });

    const categories: MenuCategory[] = categoryRows.map((c) => ({
        id: c.id,
        branchId: c.branchId,
        name: c.name,
        slug: c.slug,
        description: c.description ?? undefined,
        image: c.image ?? undefined,
        icon: c.icon ?? undefined,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    }));

    const items: MenuItem[] = itemRows.map((i) => ({
        id: i.id,
        branchId: i.branchId,
        categoryId: i.categoryId,
        name: i.name,
        slug: i.slug,
        description: i.description,
        image: i.image ?? undefined,
        basePrice: i.basePrice,
        variants: i.variants.map((v) => ({
            id: v.id, name: v.name, price: v.price, isDefault: v.isDefault, isAvailable: v.isAvailable,
        })),
        modifierGroups: i.modifierGroups.map((g) => ({
            id: g.id, name: g.name, isRequired: g.isRequired,
            minSelections: g.minSelections, maxSelections: g.maxSelections,
            options: g.options.map((o) => ({
                id: o.id, name: o.name, priceAdjustment: o.priceAdjustment,
                isDefault: o.isDefault, isAvailable: o.isAvailable,
            })),
        })),
        status: i.status,
        sortOrder: i.sortOrder,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    }));

    return { data: { categories, items } };
}

// ─── Create public (customer-facing) order ──────────────────────────────

export interface PublicOrderItemInput {
    menuItemId: string;
    variantId?: string;
    modifierOptionIds: string[];
    quantity: number;
    notes?: string;
}

export interface CreatePublicOrderInput {
    branchId: string; // resolved client-side via area selection; re-verified below
    customerName?: string;
    customerPhone: string;
    deliveryAddress: string;
    city: string;
    area: string;
    items: PublicOrderItemInput[];
    notes?: string;
}

export async function createPublicOrderAction(
    input: CreatePublicOrderInput
): Promise<{ success: true; order: Order } | { success?: undefined; error: string }> {
    const tenantId = getTenantId();

    if (input.items.length === 0) return { error: "Cannot place an order with no items." };
    if (!input.customerPhone?.trim()) return { error: "A phone number is required." };
    if (!input.deliveryAddress?.trim()) return { error: "A delivery address is required." };

    try {
        const result = await db.transaction(async (tx) => {
            const branch = await tx.query.branches.findFirst({
                where: and(eq(branches.id, input.branchId), eq(branches.tenantId, tenantId), eq(branches.isActive, true)),
            });
            if (!branch) throw new Error("Selected branch is not available.");

            const [branchCountRow] = await tx
                .select({ value: count() })
                .from(branches)
                .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)));

            if ((branchCountRow?.value ?? 0) >= 2) {
                const areaMatch = await tx.query.branchDeliveryAreas.findFirst({
                    where: and(
                        eq(branchDeliveryAreas.tenantId, tenantId),
                        eq(branchDeliveryAreas.branchId, input.branchId),
                        eq(branchDeliveryAreas.city, input.city),
                        eq(branchDeliveryAreas.area, input.area)
                    ),
                });
                if (!areaMatch) {
                    throw new Error("This branch does not deliver to the selected area.");
                }
            }

            const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
            const realMenuItems = await tx.query.menuItems.findMany({
                where: and(
                    inArray(menuItems.id, menuItemIds),
                    eq(menuItems.tenantId, tenantId),
                    eq(menuItems.branchId, input.branchId)
                ),
                with: { variants: true, modifierGroups: { with: { options: true } } },
            });
            const menuItemMap = new Map(realMenuItems.map((m) => [m.id, m]));

            const builtItems = input.items.map((line) => {
                const menuItem = menuItemMap.get(line.menuItemId);
                if (!menuItem) throw new Error(`Menu item not found: ${line.menuItemId}`);
                if (menuItem.status !== "available") throw new Error(`"${menuItem.name}" is currently unavailable.`);

                let unitPrice = menuItem.basePrice;
                let selectedVariant = null;
                if (line.variantId) {
                    const variant = menuItem.variants.find((v) => v.id === line.variantId);
                    if (!variant) throw new Error(`Invalid variant for "${menuItem.name}".`);
                    unitPrice = variant.price;
                    selectedVariant = { variantId: variant.id, variantName: variant.name, priceAdjustment: 0 };
                }

                const allOptions = menuItem.modifierGroups.flatMap((g) =>
                    g.options.map((o) => ({ ...o, groupId: g.id, groupName: g.name }))
                );
                const selectedModifiers = line.modifierOptionIds.map((optId) => {
                    const opt = allOptions.find((o) => o.id === optId);
                    if (!opt) throw new Error(`Invalid option for "${menuItem.name}".`);
                    unitPrice += opt.priceAdjustment;
                    return {
                        groupId: opt.groupId, groupName: opt.groupName,
                        optionId: opt.id, optionName: opt.name, priceAdjustment: opt.priceAdjustment,
                    };
                });

                return {
                    menuItemId: menuItem.id,
                    menuItemName: menuItem.name,
                    menuItemImage: menuItem.image ?? null,
                    categoryId: menuItem.categoryId,
                    categoryName: "",
                    quantity: line.quantity,
                    unitPrice,
                    itemTotal: unitPrice * line.quantity,
                    selectedVariant,
                    selectedModifiers,
                    notes: line.notes ?? null,
                };
            });

            const categoryIds = [...new Set(builtItems.map((i) => i.categoryId))];
            const categoryRows = await tx.query.menuCategories.findMany({
                where: inArray(menuCategories.id, categoryIds),
            });
            const categoryNameMap = new Map(categoryRows.map((c) => [c.id, c.name]));
            for (const item of builtItems) {
                item.categoryName = categoryNameMap.get(item.categoryId) ?? "Uncategorized";
            }

            const subtotal = builtItems.reduce((sum, i) => sum + i.itemTotal, 0);
            const deliveryFee =
                RESTAURANT_CONFIG.enableFreeDelivery && subtotal >= RESTAURANT_CONFIG.freeDeliveryThreshold
                    ? 0
                    : RESTAURANT_CONFIG.defaultDeliveryFee;
            const total = subtotal + deliveryFee;

            const [counter] = await tx
                .insert(orderCounters)
                .values({ branchId: input.branchId, tenantId, nextNumber: 2 })
                .onConflictDoUpdate({
                    target: orderCounters.branchId,
                    set: { nextNumber: sql`${orderCounters.nextNumber} + 1` },
                })
                .returning();
            const orderNumber = `ORD-${String(counter.nextNumber - 1).padStart(4, "0")}`;

            const [createdOrder] = await tx
                .insert(orders)
                .values({
                    tenantId,
                    branchId: input.branchId,
                    orderNumber,
                    customerPhone: input.customerPhone,
                    customerName: input.customerName ?? null,
                    orderType: "delivery",
                    status: "pending",
                    subtotal,
                    totalDiscount: 0,
                    deliveryFee,
                    total,
                    deliveryAddress: `${input.deliveryAddress}, ${input.area}, ${input.city}`,
                    notes: input.notes ?? null,
                    staffId: null,
                })
                .returning();

            const insertedItems = await tx
                .insert(orderItems)
                .values(
                    builtItems.map((i) => ({
                        tenantId,
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

            return { order: createdOrder, items: insertedItems };
        });

        return {
            success: true,
            order: {
                id: result.order.id,
                orderNumber: result.order.orderNumber,
                branchId: result.order.branchId,
                customerPhone: result.order.customerPhone ?? undefined,
                orderType: result.order.orderType,
                status: result.order.status,
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
        return { error: (err as Error).message };
    }
}