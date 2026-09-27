import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export interface StaffPerformanceRow {
  staffId: string | null;
  name: string;
  isDeleted: boolean;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export async function getStaffPerformance(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<StaffPerformanceRow[]> {
  // orders.staffName is a persisted snapshot written at order-creation time
  // (see orders.staffId's onDelete: "set null" comment in schema), so a
  // deleted staff member's past orders still carry their name here — no
  // join to the live `staff` table needed, and nothing to silently drop.
  const rows = await db
    .select({
      staffId: orders.staffId,
      staffName: orders.staffName,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.branchId, branchId),
        eq(orders.status, "completed"),
        gte(orders.completedAt, start),
        lt(orders.completedAt, end)
      )
    )
    // Group by staffId AND staffName — multiple deleted staff all share
    // staffId = null, so grouping by staffId alone would collapse them
    // into a single "Deleted staff" row.
    .groupBy(orders.staffId, orders.staffName)
    .orderBy(sql`coalesce(sum(${orders.total}), 0) desc`);

  // A live (non-null) staffId can still appear as multiple grouped rows here
  // if the staff member's name was edited mid-period — orders.staffName is a
  // per-order snapshot, so a rename splits their revenue across two name
  // variants under the same staffId. Deleted staff (staffId = null) must stay
  // split by name (that's the whole reason for grouping on staffId+staffName
  // in the query above), but a real staffId should always collapse to one row.
  const merged = new Map<string, { staffId: string | null; name: string; revenue: number; orderCount: number }>();

  for (const r of rows) {
    const key = r.staffId ?? `deleted:${r.staffName}`;
    const revenue = Number(r.revenue);
    const orderCount = Number(r.orderCount);
    const existing = merged.get(key);
    if (existing) {
      existing.revenue += revenue;
      existing.orderCount += orderCount;
    } else {
      merged.set(key, {
        staffId: r.staffId,
        name: r.staffName ?? "Unknown",
        revenue,
        orderCount,
      });
    }
  }

  return Array.from(merged.values())
    .map((r) => ({
      staffId: r.staffId,
      name: r.name,
      isDeleted: !r.staffId,
      revenue: r.revenue,
      orderCount: r.orderCount,
      averageOrderValue: r.orderCount > 0 ? Math.round(r.revenue / r.orderCount) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}