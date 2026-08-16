import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export interface OrdersByStatus {
  status: string;
  count: number;
}

export interface OrdersByType {
  orderType: string;
  count: number;
}

export interface OrderReportSummary {
  totalOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
}

function ordersScope(tenantId: string, branchId: string, start: Date, end: Date) {
  return and(
    eq(orders.tenantId, tenantId),
    eq(orders.branchId, branchId),
    gte(orders.createdAt, start),
    lt(orders.createdAt, end)
  );
}

export async function getOrderReportSummary(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<OrderReportSummary> {
  const [row] = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      cancelledOrders: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')`,
    })
    .from(orders)
    .where(ordersScope(tenantId, branchId, start, end));

  const totalOrders = Number(row.totalOrders);
  const cancelledOrders = Number(row.cancelledOrders);

  return {
    totalOrders,
    cancelledOrders,
    cancellationRate: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
  };
}

export async function getOrdersByStatus(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<OrdersByStatus[]> {
  const rows = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(ordersScope(tenantId, branchId, start, end))
    .groupBy(orders.status);

  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

export async function getOrdersByType(
  tenantId: string,
  branchId: string,
  start: Date,
  end: Date
): Promise<OrdersByType[]> {
  const rows = await db
    .select({
      orderType: orders.orderType,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(ordersScope(tenantId, branchId, start, end))
    .groupBy(orders.orderType);

  return rows.map((r) => ({ orderType: r.orderType, count: Number(r.count) }));
}