import { db } from "@/db";
import { orders, stockMovements } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { RESTAURANT_CONFIG } from "@/lib/restaurantConfig";

export interface ProfitabilitySummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  wastageLoss: number;
  correctionLoss: number;
  inventoryLoss: number;
  netProfit: number;
  profitMarginPct: number;
  foodCostPct: number;
}

// Matches salesQueries.ts's completedOrdersScope — same revenue definition
// as the Sales report (completed orders, by completedAt), so this report's
// Revenue figure lines up with the existing Sales report for the same
// period rather than introducing a second, subtly different number.
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

export async function getProfitabilitySummary(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<ProfitabilitySummary> {
  const [revenueRow] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(completedOrdersScope(tenantId, branchId, start, end));

  const [movementRow] = await db
    .select({
      cogs: sql<number>`coalesce(sum(${stockMovements.costImpact}) filter (where ${stockMovements.reason} = 'sale'), 0)`,
      wastage: sql<number>`coalesce(sum(${stockMovements.costImpact}) filter (where ${stockMovements.reason} = 'wastage'), 0)`,
      correction: sql<number>`coalesce(sum(${stockMovements.costImpact}) filter (where ${stockMovements.reason} = 'correction'), 0)`,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.branchId, branchId),
        gte(stockMovements.createdAt, start),
        lt(stockMovements.createdAt, end)
      )
    );

  const revenue = Number(revenueRow.revenue);
  const cogs = Math.abs(Number(movementRow.cogs));
  const wastageLoss = Math.abs(Number(movementRow.wastage));
  const correctionLoss = Math.abs(Number(movementRow.correction));
  const inventoryLoss = wastageLoss + correctionLoss;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - inventoryLoss;

  return {
    revenue,
    cogs,
    grossProfit,
    wastageLoss,
    correctionLoss,
    inventoryLoss,
    netProfit,
    profitMarginPct: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
    foodCostPct: revenue > 0 ? Math.round((cogs / revenue) * 100) : 0,
  };
}

export interface ProfitabilityTrendPoint {
  bucket: string; // YYYY-MM-DD or YYYY-MM, tenant-local, depending on granularity
  revenue: number;
  totalCost: number; // COGS + wastage + correction combined, same components as netProfit above
  netProfit: number;
  profitMarginPct: number;
}

export interface ProfitabilityTrend {
  granularity: "day" | "month";
  points: ProfitabilityTrendPoint[];
}

const MONTHLY_BUCKET_THRESHOLD_DAYS = 62;

export async function getProfitabilityTrend(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<ProfitabilityTrend> {
  const tz = RESTAURANT_CONFIG.timezone;
  const rangeDays = (end.getTime() - start.getTime()) / 86_400_000;
  const byMonth = rangeDays > MONTHLY_BUCKET_THRESHOLD_DAYS;
  const bucketFormat = byMonth ? "YYYY-MM" : "YYYY-MM-DD";

  const [revenueRows, movementRows] = await Promise.all([
    db
      .select({
        bucket: sql<string>`to_char(${orders.completedAt} AT TIME ZONE ${tz}, ${bucketFormat})`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      })
      .from(orders)
      .where(completedOrdersScope(tenantId, branchId, start, end))
      .groupBy(sql`1`),
    db
      .select({
        bucket: sql<string>`to_char(${stockMovements.createdAt} AT TIME ZONE ${tz}, ${bucketFormat})`,
        cogs: sql<number>`coalesce(sum(${stockMovements.costImpact}) filter (where ${stockMovements.reason} = 'sale'), 0)`,
        wastage: sql<number>`coalesce(sum(${stockMovements.costImpact}) filter (where ${stockMovements.reason} = 'wastage'), 0)`,
        correction: sql<number>`coalesce(sum(${stockMovements.costImpact}) filter (where ${stockMovements.reason} = 'correction'), 0)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.branchId, branchId),
          gte(stockMovements.createdAt, start),
          lt(stockMovements.createdAt, end)
        )
      )
      .groupBy(sql`1`),
  ]);

  const revenueByBucket = new Map(revenueRows.map((r) => [r.bucket, Number(r.revenue)]));
  const costByBucket = new Map(
    movementRows.map((r) => [
      r.bucket,
      Math.abs(Number(r.cogs)) + Math.abs(Number(r.wastage)) + Math.abs(Number(r.correction)),
    ])
  );

  const buckets = new Set([...revenueByBucket.keys(), ...costByBucket.keys()]);

  const points = Array.from(buckets)
    .sort()
    .map((bucket) => {
      const revenue = revenueByBucket.get(bucket) ?? 0;
      const totalCost = costByBucket.get(bucket) ?? 0;
      const netProfit = revenue - totalCost;
      return {
        bucket,
        revenue,
        totalCost,
        netProfit,
        profitMarginPct: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
      };
    });

  return { granularity: byMonth ? "month" : "day", points };
}