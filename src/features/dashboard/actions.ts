// src/features/dashboard/actions.ts
"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staff, orders, restaurantTables } from "@/db/schema";
import { eq, and, gte, lt, ne, sql } from "drizzle-orm";
import type { DashboardStats } from "@/types/analytics";

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

export async function getDashboardStatsAction(): Promise <
  { stats: DashboardStats; error?: undefined } | { stats: null; error: string }
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
  const branchId = isAdmin ? currentStaffRow.branchId! : undefined;

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