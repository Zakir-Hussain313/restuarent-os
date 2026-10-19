import type { db } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { menuItems, menuCategories, type OrderItem, type Coupon } from "@/db/schema";

// Works inside a transaction or against the global client.
export type PricingDbClient = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

// One cart line as sent by the client — never carries a price.
export interface PricingLineInput {
    menuItemId: string;
    variantId?: string;
    modifierOptionIds: string[];
    quantity: number;
    notes?: string;
}

// One order line priced from real DB data, ready to insert into order_items.
export interface PricedOrderLine {
    menuItemId: string;
    menuItemName: string;
    menuItemImage: string | null;
    categoryId: string;
    categoryName: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
    selectedVariant: OrderItem["selectedVariant"];
    selectedModifiers: OrderItem["selectedModifiers"];
    notes: string | null;
}

// Fetches the real menu data for every line, validates availability,
// variants and modifiers, and prices each line from the database.
// Throws a plain Error with a user-facing message on any invalid line.
export async function buildPricedOrderLines(
    tx: PricingDbClient,
    params: { tenantId: string; branchId: string; lines: PricingLineInput[] }
): Promise<PricedOrderLine[]> {
    const { tenantId, branchId, lines } = params;
    if (lines.length === 0) return [];

    const menuItemIds = [...new Set(lines.map((l) => l.menuItemId))];
    const realMenuItems = await tx.query.menuItems.findMany({
        where: and(
            inArray(menuItems.id, menuItemIds),
            eq(menuItems.tenantId, tenantId),
            eq(menuItems.branchId, branchId)
        ),
        with: {
            variants: true,
            modifierGroups: { with: { options: true } },
        },
    });
    const menuItemMap = new Map(realMenuItems.map((m) => [m.id, m]));

    const built = lines.map((line): PricedOrderLine => {
        const menuItem = menuItemMap.get(line.menuItemId);
        if (!menuItem) {
            throw new Error(`Menu item not found or unavailable: ${line.menuItemId}`);
        }
        if (menuItem.status !== "available") {
            throw new Error(`"${menuItem.name}" is not currently available.`);
        }

        let unitPrice = menuItem.basePrice;
        let selectedVariant: OrderItem["selectedVariant"] = null;

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

        return {
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            menuItemImage: menuItem.image ?? null,
            categoryId: menuItem.categoryId,
            categoryName: "", // filled below
            quantity: line.quantity,
            unitPrice,
            itemTotal: unitPrice * line.quantity,
            selectedVariant,
            selectedModifiers,
            notes: line.notes ?? null,
        };
    });

    // Category names are snapshotted onto the order line.
    const categoryIds = [...new Set(built.map((i) => i.categoryId))];
    const categories = await tx.query.menuCategories.findMany({
        where: inArray(menuCategories.id, categoryIds),
    });
    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
    for (const line of built) {
        line.categoryName = categoryNameMap.get(line.categoryId) ?? "Uncategorized";
    }

    return built;
}

// Pure discount math for a coupon against a set of lines. Does NOT check
// the coupon's validity (active, dates, usage, branch) — callers decide
// whether that applies. `hasEligibleItems` is false when the coupon is
// restricted to specific items/categories and none of the lines match.
export function calculateCouponDiscount(
    coupon: Pick<Coupon, "discountType" | "discountValue" | "menuItemIds" | "categoryIds">,
    lines: Pick<PricedOrderLine, "menuItemId" | "categoryId" | "itemTotal">[],
    subtotal: number
): { amount: number; hasEligibleItems: boolean } {
    const isScoped = Boolean(coupon.menuItemIds || coupon.categoryIds);

    const base = isScoped
        ? lines.reduce((sum, i) => {
            const itemEligible =
                (coupon.menuItemIds?.includes(i.menuItemId) ?? false) ||
                (coupon.categoryIds?.includes(i.categoryId) ?? false);
            return itemEligible ? sum + i.itemTotal : sum;
        }, 0)
        : subtotal;

    if (isScoped && base === 0) return { amount: 0, hasEligibleItems: false };

    const amount =
        coupon.discountType === "percentage"
            ? Math.round(base * (Math.min(coupon.discountValue, 100) / 100))
            : Math.min(coupon.discountValue, base);

    return { amount, hasEligibleItems: true };
}