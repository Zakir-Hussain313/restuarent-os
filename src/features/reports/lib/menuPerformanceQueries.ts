import { db } from "@/db";
import { orders, orderItems, ingredients, recipeIngredients } from "@/db/schema";
import { eq, and, gte, lt, ne, sql } from "drizzle-orm";

export interface MenuItemPerformance {
  menuItemId: string;
  name: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

// orderItems has no menuItemVariantId FK — the variant is a jsonb snapshot
// (selectedVariant.variantId). A recipe line applies when its
// menuItemVariantId is null (all variants) or matches the ordered variant.
async function getMenuItemCosts(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      cost: sql<number>`coalesce(sum(${orderItems.quantity} * ${recipeIngredients.quantityPerUnit} * ${ingredients.avgCostPerUnit}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(
      recipeIngredients,
      and(
        eq(recipeIngredients.menuItemId, orderItems.menuItemId),
        sql`(${recipeIngredients.menuItemVariantId} IS NULL OR ${recipeIngredients.menuItemVariantId} = (${orderItems.selectedVariant}->>'variantId')::uuid)`
      )
    )
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.branchId, branchId),
        eq(orders.status, "completed"),
        ne(orderItems.status, "cancelled"),
        gte(orders.completedAt, start),
        lt(orders.completedAt, end)
      )
    )
    .groupBy(orderItems.menuItemId);

  return new Map(rows.map((r) => [r.menuItemId, Number(r.cost)]));
}

export async function getMenuItemPerformance(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<MenuItemPerformance[]> {
  const [rows, costs] = await Promise.all([
    db
      .select({
        menuItemId: orderItems.menuItemId,
        name: sql<string>`max(${orderItems.menuItemName})`,
        categoryName: sql<string>`max(${orderItems.categoryName})`,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${orderItems.itemTotal}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.branchId, branchId),
          eq(orders.status, "completed"),
          ne(orderItems.status, "cancelled"),
          gte(orders.completedAt, start),
          lt(orders.completedAt, end)
        )
      )
      .groupBy(orderItems.menuItemId)
      .orderBy(sql`sum(${orderItems.quantity}) desc`),
    getMenuItemCosts(tenantId, branchId, start, end),
  ]);

  return rows.map((r) => {
    const revenue = Number(r.revenue);
    const cost = costs.get(r.menuItemId) ?? 0;
    const margin = revenue - cost;
    return {
      menuItemId: r.menuItemId,
      name: r.name,
      categoryName: r.categoryName,
      quantitySold: Number(r.quantitySold),
      revenue,
      cost,
      margin,
      marginPercent: revenue > 0 ? Math.round((margin / revenue) * 100) : 0,
    };
  });
}

export interface CategoryPerformance {
  categoryName: string;
  quantitySold: number;
  revenue: number;
}

export async function getCategoryPerformance(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<CategoryPerformance[]> {
  const rows = await db
    .select({
      categoryName: orderItems.categoryName,
      quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      revenue: sql<number>`coalesce(sum(${orderItems.itemTotal}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.branchId, branchId),
        eq(orders.status, "completed"),
        ne(orderItems.status, "cancelled"),
        gte(orders.completedAt, start),
        lt(orders.completedAt, end)
      )
    )
    .groupBy(orderItems.categoryName)
    .orderBy(sql`sum(${orderItems.itemTotal}) desc`);

  return rows.map((r) => ({
    categoryName: r.categoryName,
    quantitySold: Number(r.quantitySold),
    revenue: Number(r.revenue),
  }));
}

export function splitTopAndBottom(
  items: MenuItemPerformance[],
  limit = 10
): { topSellers: MenuItemPerformance[]; worstSellers: MenuItemPerformance[] } {
  const topSellers = items.slice(0, limit);

  if (items.length <= limit) {
    return { topSellers, worstSellers: [] };
  }

  const worstSellers = items.slice(-limit).reverse();
  return { topSellers, worstSellers };
}