import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { RESTAURANT_CONFIG } from "@/lib/restaurantConfig";

export interface SalesTrendPoint {
  date: string; // YYYY-MM-DD, tenant-local
  revenue: number;
  orderCount: number;
}

export interface PeakHourPoint {
  hour: number; // 0-23, tenant-local
  revenue: number;
  orderCount: number;
}

// Matches salesQueries.ts's completedOrdersScope exactly — same revenue
// definition as the Sales report.
function completedOrdersScope(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
) {
  return and(
    eq(orders.tenantId, tenantId),
    eq(orders.branchId, branchId),
    eq(orders.status, "completed"),
    gte(orders.completedAt, start),
    lt(orders.completedAt, end)
  );
}

export async function getSalesTrendByDay(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<SalesTrendPoint[]> {
  const tz = RESTAURANT_CONFIG.timezone;

  const rows = await db
    .select({
      date: sql<string>`to_char(${orders.completedAt} AT TIME ZONE ${tz}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(completedOrdersScope(tenantId, branchId, start, end))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((r) => ({
    date: r.date,
    revenue: Number(r.revenue),
    orderCount: Number(r.orderCount),
  }));
}

export async function getPeakHourBreakdown(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<PeakHourPoint[]> {
  const tz = RESTAURANT_CONFIG.timezone;

  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.completedAt} AT TIME ZONE ${tz})`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(completedOrdersScope(tenantId, branchId, start, end))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return rows.map((r) => ({
    hour: Number(r.hour),
    revenue: Number(r.revenue),
    orderCount: Number(r.orderCount),
  }));
}