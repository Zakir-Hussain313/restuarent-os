import { db } from "@/db";
import { orders, branches } from "@/db/schema";
import { eq, and, inArray, gte, lt, sql } from "drizzle-orm";

export interface BranchComparisonRow {
  branchId: string;
  branchName: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

export async function getBranchComparison(
  tenantId: string,
  branchIds: string[],
  start: Date,
  end: Date
): Promise<BranchComparisonRow[]> {
  const rows = await db
    .select({
      branchId: orders.branchId,
      branchName: sql<string>`max(${branches.name})`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .innerJoin(branches, eq(orders.branchId, branches.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        inArray(orders.branchId, branchIds),
        eq(orders.status, "completed"),
        gte(orders.completedAt, start),
        lt(orders.completedAt, end)
      )
    )
    .groupBy(orders.branchId);

  const byBranchId = new Map(
    rows.map((r) => [
      r.branchId,
      {
        branchId: r.branchId,
        branchName: r.branchName,
        revenue: Number(r.revenue),
        orderCount: Number(r.orderCount),
      },
    ])
  );

  // Ensure every requested branch appears even with zero completed orders —
  // a silent-zero branch is meaningful data for a comparison view, not
  // something to drop from the list.
  return branchIds.map((id) => {
    const match = byBranchId.get(id);
    const revenue = match?.revenue ?? 0;
    const orderCount = match?.orderCount ?? 0;
    return {
      branchId: id,
      branchName: match?.branchName ?? "",
      revenue,
      orderCount,
      averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
    };
  });
}