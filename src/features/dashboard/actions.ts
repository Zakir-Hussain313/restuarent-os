// src/features/dashboard/actions.ts
"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { eq, and, gte, lt, ne, sql, desc } from "drizzle-orm";
import type { DashboardStats, RevenueDataPoint, TopMenuItem, OrderTypeBreakdown } from "@/types/analytics";
import { staff, orders, orderItems, restaurantTables, tableReservations } from "@/db/schema";
import type { OrderStatus, OrderType } from "@/types";
import type { Table } from "@/types/table";

export interface RecentOrder {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemsCount: number;
  tableNumber: string | null;
}

function getMonthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { start, end };
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardStatsAction(
  overrideBranchId?: string
): Promise<{ stats: DashboardStats; error?: undefined } | { stats: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { stats: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { stats: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { stats: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  // ADMIN is always locked to their own branch, regardless of what's in
  // the URL — overrideBranchId is only ever honored for SUPER_ADMIN.
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const { start: curStart, end: curEnd } = getMonthRange(0);
  const { start: prevStart, end: prevEnd } = getMonthRange(-1);

  function orderScope(start: Date, end: Date) {
    return and(
      eq(orders.tenantId, tenantId),
      ne(orders.status, "cancelled"),
      gte(orders.createdAt, start),
      lt(orders.createdAt, end),
      branchId ? eq(orders.branchId, branchId) : undefined
    );
  }

  const [curAgg] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      totalOrders: sql<number>`count(*)`,
      totalCustomers: sql<number>`count(distinct ${orders.customerPhone})`,
    })
    .from(orders)
    .where(orderScope(curStart, curEnd));

  const [prevAgg] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      totalOrders: sql<number>`count(*)`,
      totalCustomers: sql<number>`count(distinct ${orders.customerPhone})`,
    })
    .from(orders)
    .where(orderScope(prevStart, prevEnd));

  const [tableAgg] = await db
    .select({
      tablesOccupied: sql<number>`count(*) filter (where ${restaurantTables.status} = 'occupied')`,
      totalTables: sql<number>`count(*)`,
    })
    .from(restaurantTables)
    .where(
      and(
        eq(restaurantTables.tenantId, tenantId),
        eq(restaurantTables.isActive, true),
        branchId ? eq(restaurantTables.branchId, branchId) : undefined
      )
    );

  const curRevenue = Number(curAgg.totalRevenue);
  const curOrders = Number(curAgg.totalOrders);
  const curCustomers = Number(curAgg.totalCustomers);
  const curAOV = curOrders > 0 ? curRevenue / curOrders : 0;

  const prevRevenue = Number(prevAgg.totalRevenue);
  const prevOrders = Number(prevAgg.totalOrders);
  const prevCustomers = Number(prevAgg.totalCustomers);
  const prevAOV = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  const stats: DashboardStats = {
    totalRevenue: curRevenue,
    revenueChange: pctChange(curRevenue, prevRevenue),
    totalOrders: curOrders,
    ordersChange: pctChange(curOrders, prevOrders),
    averageOrderValue: Math.round(curAOV),
    aovChange: pctChange(curAOV, prevAOV),
    totalCustomers: curCustomers,
    customersChange: pctChange(curCustomers, prevCustomers),
    tablesOccupied: Number(tableAgg.tablesOccupied),
    totalTables: Number(tableAgg.totalTables),
  };

  return { stats };
}


const RANGE_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getRevenueDataAction(
  range: "7d" | "30d" | "90d" = "30d",
  overrideBranchId?: string
): Promise<{ data: RevenueDataPoint[]; error?: undefined } | { data: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const days = RANGE_DAYS[range];
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const rangeStart = new Date(todayUTC);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - (days - 1));

  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<number>`count(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        ne(orders.status, "cancelled"),
        gte(orders.createdAt, rangeStart),
        branchId ? eq(orders.branchId, branchId) : undefined
      )
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`);

  const byDay = new Map(rows.map((r) => [r.day, r]));

  const result: RevenueDataPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setUTCDate(d.getUTCDate() + i);
    const key = toDateKey(d);
    const row = byDay.get(key);

    const revenue = row ? Number(row.revenue) : 0;
    const orderCount = row ? Number(row.orderCount) : 0;

    result.push({
      date: key,
      revenue,
      orders: orderCount,
      averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
    });
  }

  return { data: result };
}

export async function getTopDishesAction(
  overrideBranchId?: string
): Promise<{ data: TopMenuItem[]; error?: undefined } | { data: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      name: sql<string>`max(${orderItems.menuItemName})`,
      image: sql<string | null>`max(${orderItems.menuItemImage})`,
      categoryName: sql<string>`max(${orderItems.categoryName})`,
      quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      revenue: sql<number>`coalesce(sum(${orderItems.itemTotal}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        ne(orders.status, "cancelled"),
        gte(orders.createdAt, monthStart),
        lt(orders.createdAt, monthEnd),
        branchId ? eq(orders.branchId, branchId) : undefined
      )
    )
    .groupBy(orderItems.menuItemId)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(10);

  const data: TopMenuItem[] = rows.map((r, i) => ({
    menuItemId: r.menuItemId,
    name: r.name,
    categoryName: r.categoryName,
    image: r.image ?? undefined,
    quantitySold: Number(r.quantitySold),
    revenue: Number(r.revenue),
    rank: i + 1,
  }));

  return { data };
}

export async function getRecentOrdersAction(
  overrideBranchId?: string
): Promise <{ data: RecentOrder[]; error?: undefined } | { data: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      tableNumber: restaurantTables.tableNumber,
      itemsCount: sql<number>`(
        select count(*) from ${orderItems} where ${orderItems.orderId} = ${orders.id}
      )`,
    })
    .from(orders)
    .leftJoin(restaurantTables, eq(orders.tableId, restaurantTables.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(6);

  const data: RecentOrder[] = rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    orderType: r.orderType,
    status: r.status,
    total: r.total,
    createdAt: r.createdAt.toISOString(),
    tableNumber: r.tableNumber ?? null,
    itemsCount: Number(r.itemsCount),
  }));

  return { data };
}

export async function getTableOccupancyAction(
  overrideBranchId?: string
): Promise <{ data: Table[]; error?: undefined } | { data: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const rows = await db
    .select({
      id: restaurantTables.id,
      branchId: restaurantTables.branchId,
      sectionId: restaurantTables.sectionId,
      tableNumber: restaurantTables.tableNumber,
      capacity: restaurantTables.capacity,
      shape: restaurantTables.shape,
      status: restaurantTables.status,
      positionX: restaurantTables.positionX,
      positionY: restaurantTables.positionY,
      isActive: restaurantTables.isActive,
      createdAt: restaurantTables.createdAt,
      updatedAt: restaurantTables.updatedAt,
      currentOrderId: sql<string | null>`(
        select ${orders.id} from ${orders}
        where ${orders.tableId} = ${restaurantTables.id}
          and ${orders.status} not in ('completed', 'cancelled')
        order by ${orders.createdAt} desc
        limit 1
      )`,
    })
    .from(restaurantTables)
    .where(
      and(
        eq(restaurantTables.tenantId, tenantId),
        eq(restaurantTables.isActive, true),
        branchId ? eq(restaurantTables.branchId, branchId) : undefined
      )
    );

  const data: Table[] = rows.map((r) => ({
    id: r.id,
    branchId: r.branchId,
    sectionId: r.sectionId,
    tableNumber: r.tableNumber,
    capacity: r.capacity,
    shape: r.shape,
    status: r.status,
    currentOrderId: r.currentOrderId ?? undefined,
    currentReservationId: undefined,
    positionX: r.positionX ?? undefined,
    positionY: r.positionY ?? undefined,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return { data };
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export async function getOrderTypeBreakdownAction(
  overrideBranchId?: string
): Promise <{ data: OrderTypeBreakdown[]; error?: undefined } | { data: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { data: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { data: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const rows = await db
    .select({
      orderType: orders.orderType,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        ne(orders.status, "cancelled"),
        gte(orders.createdAt, monthStart),
        lt(orders.createdAt, monthEnd),
        branchId ? eq(orders.branchId, branchId) : undefined
      )
    )
    .groupBy(orders.orderType);

  const byType = new Map(rows.map((r) => [r.orderType, r]));
  const totalOrders = rows.reduce((sum, r) => sum + Number(r.count), 0);

  const data: OrderTypeBreakdown[] = (["dine_in", "takeaway", "delivery"] as const).map(
    (type) => {
      const row = byType.get(type);
      const count = row ? Number(row.count) : 0;
      const revenue = row ? Number(row.revenue) : 0;
      return {
        orderType: ORDER_TYPE_LABELS[type],
        count,
        revenue,
        percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
      };
    }
  );

  return { data };
}


export interface ReservationStats {
  totalReservations: number;
  reservationsChange: number;
  statusBreakdown: { status: string; count: number }[];
}

export async function getReservationStatsAction(
  overrideBranchId?: string
): Promise<{ stats: ReservationStats; error?: undefined } | { stats: null; error: string }
> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { stats: null, error: "Not authenticated." };

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });
  if (!currentStaffRow) return { stats: null, error: "Staff record not found." };

  const isAdmin = currentStaffRow.role === "ADMIN";
  if (isAdmin && !currentStaffRow.branchId) {
    return { stats: null, error: "Your account has no branch assigned." };
  }

  const tenantId = currentStaffRow.tenantId;
  const branchId = isAdmin ? currentStaffRow.branchId! : overrideBranchId;

  const { start: curStart, end: curEnd } = getMonthRange(0);
  const { start: prevStart, end: prevEnd } = getMonthRange(-1);

  function reservationScope(start: Date, end: Date) {
    return and(
      eq(tableReservations.tenantId, tenantId),
      gte(tableReservations.createdAt, start),
      lt(tableReservations.createdAt, end),
      branchId ? eq(tableReservations.branchId, branchId) : undefined
    );
  }

  const [curAgg] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tableReservations)
    .where(reservationScope(curStart, curEnd));

  const [prevAgg] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tableReservations)
    .where(reservationScope(prevStart, prevEnd));

  const breakdownRows = await db
    .select({
      status: tableReservations.status,
      count: sql<number>`count(*)`,
    })
    .from(tableReservations)
    .where(reservationScope(curStart, curEnd))
    .groupBy(tableReservations.status);

  const curCount = Number(curAgg.count);
  const prevCount = Number(prevAgg.count);

  const stats: ReservationStats = {
    totalReservations: curCount,
    reservationsChange: pctChange(curCount, prevCount),
    statusBreakdown: breakdownRows.map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
  };

  return { stats };
}