import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
}

export interface SalesByPaymentMethod {
  method: string;
  amount: number;
}

export interface SalesByOrderType {
  orderType: string;
  count: number;
  revenue: number;
}

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

export async function getSalesSummary(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<SalesSummary> {
  const [row] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      totalOrders: sql<number>`count(*)`,
      totalDiscount: sql<number>`coalesce(sum(${orders.totalDiscount}), 0)`,
    })
    .from(orders)
    .where(completedOrdersScope(tenantId, branchId, start, end));

  const totalRevenue = Number(row.totalRevenue);
  const totalOrders = Number(row.totalOrders);

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    totalDiscount: Number(row.totalDiscount),
  };
}

export async function getSalesByPaymentMethod(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<SalesByPaymentMethod[]> {
  const rows = await db
    .select({
      method: payments.method,
      amount: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(completedOrdersScope(tenantId, branchId, start, end))
    .groupBy(payments.method);

  return rows.map((r) => ({ method: r.method, amount: Number(r.amount) }));
}

export async function getSalesByOrderType(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<SalesByOrderType[]> {
  const rows = await db
    .select({
      orderType: orders.orderType,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(completedOrdersScope(tenantId, branchId, start, end))
    .groupBy(orders.orderType);

  return rows.map((r) => ({
    orderType: r.orderType,
    count: Number(r.count),
    revenue: Number(r.revenue),
  }));
}