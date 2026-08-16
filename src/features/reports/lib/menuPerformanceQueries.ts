import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and, gte, lt, ne, sql } from "drizzle-orm";

export interface MenuItemPerformance {
  menuItemId: string;
  name: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
}

export async function getMenuItemPerformance(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<MenuItemPerformance[]> {
  const rows = await db
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
    .orderBy(sql`sum(${orderItems.quantity}) desc`);

  return rows.map((r) => ({
    menuItemId: r.menuItemId,
    name: r.name,
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