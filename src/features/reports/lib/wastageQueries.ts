import { db } from "@/db";
import { stockMovements, ingredients } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { RESTAURANT_CONFIG } from "@/lib/restaurantConfig";

const MONTHLY_BUCKET_THRESHOLD_DAYS = 62;

export interface WastageTrendPoint {
  bucket: string; // YYYY-MM-DD or YYYY-MM, tenant-local, depending on granularity
  quantity: number;
  cost: number;
}

export interface WastageTrend {
  granularity: "day" | "month";
  points: WastageTrendPoint[];
}

// Deliberately scoped to reason='wastage' only — 'correction' is tracked as
// its own separate line in the Profitability summary and shouldn't be lumped
// back in here, or the two numbers would stop matching each other.
export async function getWastageTrend(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<WastageTrend> {
  const tz = RESTAURANT_CONFIG.timezone;
  const rangeDays = (end.getTime() - start.getTime()) / 86_400_000;
  const byMonth = rangeDays > MONTHLY_BUCKET_THRESHOLD_DAYS;
  const bucketFormat = byMonth ? "YYYY-MM" : "YYYY-MM-DD";

  const rows = await db
    .select({
      bucket: sql<string>`to_char(${stockMovements.createdAt} AT TIME ZONE ${tz}, ${bucketFormat})`,
      quantity: sql<number>`coalesce(sum(abs(${stockMovements.quantityChange})), 0)`,
      cost: sql<number>`coalesce(sum(abs(${stockMovements.costImpact})), 0)`,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.branchId, branchId),
        eq(stockMovements.reason, "wastage"),
        gte(stockMovements.createdAt, start),
        lt(stockMovements.createdAt, end)
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  return {
    granularity: byMonth ? "month" : "day",
    points: rows.map((r) => ({
      bucket: r.bucket,
      quantity: Number(r.quantity),
      cost: Number(r.cost),
    })),
  };
}

export interface WastageByIngredient {
  ingredientId: string;
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

export async function getWastageByIngredient(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<WastageByIngredient[]> {
  const rows = await db
    .select({
      ingredientId: stockMovements.ingredientId,
      name: sql<string>`max(${ingredients.name})`,
      unit: sql<string>`max(${ingredients.unit})`,
      quantity: sql<number>`coalesce(sum(abs(${stockMovements.quantityChange})), 0)`,
      cost: sql<number>`coalesce(sum(abs(${stockMovements.costImpact})), 0)`,
    })
    .from(stockMovements)
    .innerJoin(ingredients, eq(ingredients.id, stockMovements.ingredientId))
    .where(
      and(
        eq(stockMovements.tenantId, tenantId),
        eq(stockMovements.branchId, branchId),
        eq(stockMovements.reason, "wastage"),
        gte(stockMovements.createdAt, start),
        lt(stockMovements.createdAt, end)
      )
    )
    .groupBy(stockMovements.ingredientId)
    .orderBy(sql`sum(abs(${stockMovements.costImpact})) desc`);

  return rows.map((r) => ({
    ingredientId: r.ingredientId,
    name: r.name,
    unit: r.unit,
    quantity: Number(r.quantity),
    cost: Number(r.cost),
  }));
}