// src/features/reports/actions.ts
"use server";

import { getSalesSummary, getSalesByPaymentMethod, getSalesByOrderType } from "./lib/salesQueries";
import { getReportDateRange, type ReportPeriod } from "./lib/getReportDateRange";
import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types";
import { getOrderReportSummary, getOrdersByStatus, getOrdersByType } from "./lib/orderQueries";
import { getMenuItemPerformance, splitTopAndBottom, getCategoryPerformance } from "./lib/menuPerformanceQueries";
import { getStaffAttendanceBreakdown, getAttendanceTotals } from "./lib/attendanceQueries";
import { getProfitabilitySummary, getProfitabilityTrend } from "./lib/profitabilityQueries";
import { getWastageTrend, getWastageByIngredient } from "./lib/wastageQueries";
import { getSalesTrendByDay, getPeakHourBreakdown } from "./lib/salesTrendsQueries";
import { getBranchComparison } from "./lib/branchComparisonQueries";
import { getStaffPerformance } from "./lib/staffPerformanceQueries";
import { db } from "@/db";
import { branches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createReportPdf, pdfBytesToBase64 } from "./lib/pdfBuilder";
import { PAYMENT_METHOD_LABELS } from "@/config/restaurant";
import { formatCurrency } from "@/lib/utils";
import { createReportWorkbook } from "./lib/xlsxBuilder";

export interface SalesReportData {
  period: ReportPeriod;
  branchId: string;
  rangeStart: string;
  rangeEnd: string;
  summary: Awaited<ReturnType<typeof getSalesSummary>>;
  byPaymentMethod: Awaited<ReturnType<typeof getSalesByPaymentMethod>>;
  byOrderType: Awaited<ReturnType<typeof getSalesByOrderType>>;
}

export async function getSalesReportAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: SalesReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (!hasPermission(currentStaff.role, "view_reports")) {
    return { data: null, error: "You don't have permission to view reports." };
  }

  // resolveSettingsBranch redirects (not returns an error) if role/branch
  // checks fail, consistent with how the existing settings pages behave.
  const { branchId } = await resolveSettingsBranch(searchParams);

  const { start, end } = getReportDateRange(period, searchParams);

  const [summary, byPaymentMethod, byOrderType] = await Promise.all([
    getSalesSummary(currentStaff.tenantId, branchId, start, end),
    getSalesByPaymentMethod(currentStaff.tenantId, branchId, start, end),
    getSalesByOrderType(currentStaff.tenantId, branchId, start, end),
  ]);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      summary,
      byPaymentMethod,
      byOrderType,
    },
  };
}

export interface OrderReportData {
  period: ReportPeriod;
  branchId: string;
  rangeStart: string;
  rangeEnd: string;
  summary: Awaited<ReturnType<typeof getOrderReportSummary>>;
  byStatus: Awaited<ReturnType<typeof getOrdersByStatus>>;
  byType: Awaited<ReturnType<typeof getOrdersByType>>;
}

export async function getOrderReportAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: OrderReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (!hasPermission(currentStaff.role, "view_reports")) {
    return { data: null, error: "You don't have permission to view reports." };
  }

  const { branchId } = await resolveSettingsBranch(searchParams);
  const { start, end } = getReportDateRange(period, searchParams);

  const [summary, byStatus, byType] = await Promise.all([
    getOrderReportSummary(currentStaff.tenantId, branchId, start, end),
    getOrdersByStatus(currentStaff.tenantId, branchId, start, end),
    getOrdersByType(currentStaff.tenantId, branchId, start, end),
  ]);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      summary,
      byStatus,
      byType,
    },
  };
}

// ─── Export builders (shared) ──────────────────────────────────────


const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

const ORDER_REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready_for_delivery: "Ready for Delivery",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Sales Export ───────────────────────────────────────────────────

export async function exportSalesReportExcelAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getSalesReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { summary, byPaymentMethod, byOrderType, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Sales Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Summary",
    ["Total Revenue", "Total Orders", "Average Order Value", "Total Discount"],
    [[
      formatCurrency(summary.totalRevenue),
      summary.totalOrders,
      formatCurrency(summary.averageOrderValue),
      formatCurrency(summary.totalDiscount),
    ]],
    { rightAlignCols: [0, 2, 3] }
  );

  workbook.addTable(
    "By Payment Method",
    ["Method", "Amount"],
    byPaymentMethod.map((r) => [PAYMENT_METHOD_LABELS[r.method] ?? r.method, formatCurrency(r.amount)]),
    { rightAlignCols: [1] }
  );

  workbook.addTable(
    "By Order Type",
    ["Type", "Count", "Revenue"],
    byOrderType.map((r) => [ORDER_TYPE_LABELS[r.orderType] ?? r.orderType, r.count, formatCurrency(r.revenue)]),
    { rightAlignCols: [1, 2] }
  );

  return {
    data: await workbook.toBase64(),
    filename: `sales-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

// ─── Order Export ───────────────────────────────────────────────────

export async function exportOrderReportExcelAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getOrderReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { summary, byStatus, byType, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Orders Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Summary",
    ["Total Orders", "Cancelled", "Cancellation Rate"],
    [[summary.totalOrders, summary.cancelledOrders, `${summary.cancellationRate}%`]],
    { rightAlignCols: [0, 1, 2] }
  );

  workbook.addTable(
    "By Status",
    ["Status", "Count"],
    byStatus.map((r) => [ORDER_REPORT_STATUS_LABELS[r.status] ?? r.status, r.count]),
    { rightAlignCols: [1] }
  );

  workbook.addTable(
    "By Order Type",
    ["Type", "Count"],
    byType.map((r) => [ORDER_TYPE_LABELS[r.orderType] ?? r.orderType, r.count]),
    { rightAlignCols: [1] }
  );

  return {
    data: await workbook.toBase64(),
    filename: `orders-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function exportOrderReportPdfAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getOrderReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { summary, byStatus, byType, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Orders Report", rangeStart, rangeEnd);

  pdf.drawKeyValueSection("Summary", [
    { label: "Total Orders", value: String(summary.totalOrders) },
    { label: "Cancelled", value: String(summary.cancelledOrders) },
    { label: "Cancellation Rate", value: `${summary.cancellationRate}%` },
  ]);

  pdf.drawTable(
    "By Status",
    ["Status", "Count"],
    byStatus.map((r) => [ORDER_REPORT_STATUS_LABELS[r.status] ?? r.status, String(r.count)]),
    { rightAlignCols: [1] }
  );

  pdf.drawTable(
    "By Order Type",
    ["Type", "Count"],
    byType.map((r) => [ORDER_TYPE_LABELS[r.orderType] ?? r.orderType, String(r.count)]),
    { rightAlignCols: [1] }
  );

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `orders-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

export async function exportSalesReportPdfAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getSalesReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { summary, byPaymentMethod, byOrderType, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Sales Report", rangeStart, rangeEnd);

  pdf.drawKeyValueSection("Summary", [
    { label: "Total Revenue", value: formatCurrency(summary.totalRevenue) },
    { label: "Total Orders", value: String(summary.totalOrders) },
    { label: "Average Order Value", value: formatCurrency(summary.averageOrderValue) },
    { label: "Total Discount", value: formatCurrency(summary.totalDiscount) },
  ]);

  pdf.drawTable(
    "By Payment Method",
    ["Method", "Amount"],
    byPaymentMethod.map((r) => [PAYMENT_METHOD_LABELS[r.method] ?? r.method, formatCurrency(r.amount)]),
    { rightAlignCols: [1] }
  );

  pdf.drawTable(
    "By Order Type",
    ["Type", "Count", "Revenue"],
    byOrderType.map((r) => [
      ORDER_TYPE_LABELS[r.orderType] ?? r.orderType,
      String(r.count),
      formatCurrency(r.revenue),
    ]),
    { rightAlignCols: [1, 2] }
  );

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `sales-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

export interface MenuPerformanceReportData {
  period: ReportPeriod;
  branchId: string;
  rangeStart: string;
  rangeEnd: string;
  topSellers: Awaited<ReturnType<typeof getMenuItemPerformance>>;
  worstSellers: Awaited<ReturnType<typeof getMenuItemPerformance>>;
  byCategory: Awaited<ReturnType<typeof getCategoryPerformance>>;
}

export async function getMenuPerformanceReportAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: MenuPerformanceReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (!hasPermission(currentStaff.role, "view_reports")) {
    return { data: null, error: "You don't have permission to view reports." };
  }

  const { branchId } = await resolveSettingsBranch(searchParams);
  const { start, end } = getReportDateRange(period, searchParams);

  const [items, byCategory] = await Promise.all([
    getMenuItemPerformance(currentStaff.tenantId, branchId, start, end),
    getCategoryPerformance(currentStaff.tenantId, branchId, start, end),
  ]);
  const { topSellers, worstSellers } = splitTopAndBottom(items);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      topSellers,
      worstSellers,
      byCategory,
    },
  };
}

export interface AttendanceReportData {
  period: ReportPeriod;
  branchId: string;
  rangeStart: string;
  rangeEnd: string;
  byStaff: Awaited<ReturnType<typeof getStaffAttendanceBreakdown>>;
  totals: ReturnType<typeof getAttendanceTotals>;
  salesByStaff: Awaited<ReturnType<typeof getStaffPerformance>>;
}

export async function getAttendanceReportAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: AttendanceReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (!hasPermission(currentStaff.role, "view_reports")) {
    return { data: null, error: "You don't have permission to view reports." };
  }

  const { branchId } = await resolveSettingsBranch(searchParams);
  const { start, end } = getReportDateRange(period, searchParams);

  const [byStaff, salesByStaff] = await Promise.all([
    getStaffAttendanceBreakdown(currentStaff.tenantId, branchId, start, end),
    getStaffPerformance(currentStaff.tenantId, branchId, start, end),
  ]);
  const totals = getAttendanceTotals(byStaff);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      byStaff,
      totals,
      salesByStaff,
    },
  };
}

// ─── Menu Performance Export ────────────────────────────────────────

export async function exportMenuPerformanceReportExcelAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getMenuPerformanceReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { topSellers, worstSellers, byCategory, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Menu Performance Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Top Sellers",
    ["Rank", "Item", "Category", "Quantity Sold", "Revenue", "Ingredient Cost", "Margin", "Margin %"],
    topSellers.map((item, i) => [
      i + 1,
      item.name,
      item.categoryName,
      item.quantitySold,
      formatCurrency(item.revenue),
      formatCurrency(item.cost),
      formatCurrency(item.margin),
      `${item.marginPercent}%`,
    ]),
    { rightAlignCols: [0, 3, 4, 5, 6, 7] }
  );

  if (worstSellers.length > 0) {
    workbook.addTable(
      "Worst Sellers",
      ["Item", "Category", "Quantity Sold", "Revenue", "Ingredient Cost", "Margin", "Margin %"],
      worstSellers.map((item) => [
        item.name,
        item.categoryName,
        item.quantitySold,
        formatCurrency(item.revenue),
        formatCurrency(item.cost),
        formatCurrency(item.margin),
        `${item.marginPercent}%`,
      ]),
      { rightAlignCols: [2, 3, 4, 5, 6] }
    );
  }

  workbook.addTable(
    "By Category",
    ["Category", "Quantity Sold", "Revenue"],
    byCategory.map((c) => [c.categoryName, c.quantitySold, formatCurrency(c.revenue)]),
    { rightAlignCols: [1, 2] }
  );

  return {
    data: await workbook.toBase64(),
    filename: `menu-performance-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function exportMenuPerformanceReportPdfAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getMenuPerformanceReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { topSellers, worstSellers, byCategory, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Menu Performance Report", rangeStart, rangeEnd);

  pdf.drawTable(
    "Top Sellers",
    ["Rank", "Item", "Category", "Qty Sold", "Revenue", "Ingredient Cost", "Margin", "Margin %"],
    topSellers.map((item, i) => [
      String(i + 1),
      item.name,
      item.categoryName,
      String(item.quantitySold),
      formatCurrency(item.revenue),
      formatCurrency(item.cost),
      formatCurrency(item.margin),
      `${item.marginPercent}%`,
    ]),
    { rightAlignCols: [0, 3, 4, 5, 6, 7] }
  );

  if (worstSellers.length > 0) {
    pdf.drawTable(
      "Worst Sellers",
      ["Item", "Category", "Qty Sold", "Revenue", "Ingredient Cost", "Margin", "Margin %"],
      worstSellers.map((item) => [
        item.name,
        item.categoryName,
        String(item.quantitySold),
        formatCurrency(item.revenue),
        formatCurrency(item.cost),
        formatCurrency(item.margin),
        `${item.marginPercent}%`,
      ]),
      { rightAlignCols: [2, 3, 4, 5, 6] }
    );
  }

  pdf.drawTable(
    "By Category",
    ["Category", "Qty Sold", "Revenue"],
    byCategory.map((c) => [c.categoryName, String(c.quantitySold), formatCurrency(c.revenue)]),
    { rightAlignCols: [1, 2] }
  );

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `menu-performance-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}

// ─── Attendance Export ──────────────────────────────────────────────

export async function exportAttendanceReportExcelAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getAttendanceReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { totals, byStaff, salesByStaff, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Staff & Attendance Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Totals",
    ["Present", "Absent", "Late", "Leave", "Half Day"],
    [[totals.present, totals.absent, totals.late, totals.leave, totals.halfDay]],
    { rightAlignCols: [0, 1, 2, 3, 4] }
  );

  workbook.addTable(
    "By Staff",
    ["Name", "Present", "Absent", "Late", "Leave", "Half Day"],
    byStaff.map((s) => [s.name, s.present, s.absent, s.late, s.leave, s.halfDay]),
    { rightAlignCols: [1, 2, 3, 4, 5] }
  );

  workbook.addTable(
    "Sales Performance By Staff",
    ["Name", "Orders", "Revenue", "Avg Order Value"],
    salesByStaff.map((s) => [
      s.isDeleted ? `${s.name} (Deleted)` : s.name,
      s.orderCount,
      formatCurrency(s.revenue),
      formatCurrency(s.averageOrderValue),
    ]),
    { rightAlignCols: [1, 2, 3] }
  );

  return {
    data: await workbook.toBase64(),
    filename: `attendance-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function exportAttendanceReportPdfAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getAttendanceReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { totals, byStaff, salesByStaff, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Staff & Attendance Report", rangeStart, rangeEnd);

  pdf.drawKeyValueSection("Totals", [
    { label: "Present", value: String(totals.present) },
    { label: "Absent", value: String(totals.absent) },
    { label: "Late", value: String(totals.late) },
    { label: "Leave", value: String(totals.leave) },
    { label: "Half Day", value: String(totals.halfDay) },
  ]);

  pdf.drawTable(
    "By Staff",
    ["Name", "Present", "Absent", "Late", "Leave", "Half Day"],
    byStaff.map((s) => [
      s.name,
      String(s.present),
      String(s.absent),
      String(s.late),
      String(s.leave),
      String(s.halfDay),
    ]),
    { rightAlignCols: [1, 2, 3, 4, 5] }
  );

  pdf.drawTable(
    "Sales Performance By Staff",
    ["Name", "Orders", "Revenue", "Avg Order Value"],
    salesByStaff.map((s) => [
      s.isDeleted ? `${s.name} (Deleted)` : s.name,
      String(s.orderCount),
      formatCurrency(s.revenue),
      formatCurrency(s.averageOrderValue),
    ]),
    { rightAlignCols: [1, 2, 3] }
  );

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `attendance-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}


// ─── Profitability Report ───────────────────────────────────────────

export interface ProfitabilityReportData {
  period: ReportPeriod;
  branchId: string;
  rangeStart: string;
  rangeEnd: string;
  summary: Awaited<ReturnType<typeof getProfitabilitySummary>>;
  trend: Awaited<ReturnType<typeof getProfitabilityTrend>>;
  wastageTrend: Awaited<ReturnType<typeof getWastageTrend>>;
  wastageByIngredient: Awaited<ReturnType<typeof getWastageByIngredient>>;
}

export async function getProfitabilityReportAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: ProfitabilityReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (!hasPermission(currentStaff.role, "view_reports")) {
    return { data: null, error: "You don't have permission to view reports." };
  }

  const { branchId } = await resolveSettingsBranch(searchParams);
  const { start, end } = getReportDateRange(period, searchParams);

  const [summary, trend, wastageTrend, wastageByIngredient] = await Promise.all([
    getProfitabilitySummary(currentStaff.tenantId, branchId, start, end),
    getProfitabilityTrend(currentStaff.tenantId, branchId, start, end),
    getWastageTrend(currentStaff.tenantId, branchId, start, end),
    getWastageByIngredient(currentStaff.tenantId, branchId, start, end),
  ]);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      summary,
      trend,
      wastageTrend,
      wastageByIngredient,
    },
  };
}

export async function exportProfitabilityReportExcelAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getProfitabilityReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { summary, trend, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Profitability Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Summary",
    ["Revenue", "Ingredient Cost", "Gross Profit", "Wastage Loss", "Correction Loss", "Net Profit", "Profit Margin", "Food Cost %"],
    [[
      formatCurrency(summary.revenue),
      formatCurrency(summary.cogs),
      formatCurrency(summary.grossProfit),
      formatCurrency(summary.wastageLoss),
      formatCurrency(summary.correctionLoss),
      formatCurrency(summary.netProfit),
      `${summary.profitMarginPct}%`,
      `${summary.foodCostPct}%`,
    ]],
    { rightAlignCols: [0, 1, 2, 3, 4, 5, 6, 7] }
  );

  if (trend.points.length > 0) {
    workbook.addTable(
      trend.granularity === "month" ? "Profit Trend (By Month)" : "Profit Trend (By Day)",
      ["Period", "Revenue", "Total Cost", "Net Profit", "Margin %"],
      trend.points.map((p) => [
        p.bucket,
        formatCurrency(p.revenue),
        formatCurrency(p.totalCost),
        formatCurrency(p.netProfit),
        `${p.profitMarginPct}%`,
      ]),
      { rightAlignCols: [1, 2, 3, 4] }
    );
  }

  const { wastageTrend, wastageByIngredient } = result.data;

  if (wastageTrend.points.length > 0) {
    workbook.addTable(
      wastageTrend.granularity === "month" ? "Wastage Trend (By Month)" : "Wastage Trend (By Day)",
      ["Period", "Quantity Wasted", "Cost"],
      wastageTrend.points.map((p) => [p.bucket, p.quantity, formatCurrency(p.cost)]),
      { rightAlignCols: [1, 2] }
    );
  }

  if (wastageByIngredient.length > 0) {
    workbook.addTable(
      "Top Wasted Ingredients",
      ["Ingredient", "Quantity Wasted", "Cost"],
      wastageByIngredient.map((w) => [w.name, `${w.quantity} ${w.unit}`, formatCurrency(w.cost)]),
      { rightAlignCols: [2] }
    );
  }

  return {
    data: await workbook.toBase64(),
    filename: `profitability-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function exportProfitabilityReportPdfAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getProfitabilityReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { summary, trend, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Profitability Report", rangeStart, rangeEnd);

  pdf.drawKeyValueSection("Summary", [
    { label: "Revenue", value: formatCurrency(summary.revenue) },
    { label: "Ingredient Cost", value: formatCurrency(summary.cogs) },
    { label: "Gross Profit", value: formatCurrency(summary.grossProfit) },
    { label: "Wastage Loss", value: formatCurrency(summary.wastageLoss) },
    { label: "Correction Loss", value: formatCurrency(summary.correctionLoss) },
    { label: "Net Profit", value: formatCurrency(summary.netProfit) },
    { label: "Profit Margin", value: `${summary.profitMarginPct}%` },
    { label: "Food Cost %", value: `${summary.foodCostPct}%` },
  ]);

  if (trend.points.length > 0) {
    pdf.drawTable(
      trend.granularity === "month" ? "Profit Trend (By Month)" : "Profit Trend (By Day)",
      ["Period", "Revenue", "Total Cost", "Net Profit", "Margin %"],
      trend.points.map((p) => [
        p.bucket,
        formatCurrency(p.revenue),
        formatCurrency(p.totalCost),
        formatCurrency(p.netProfit),
        `${p.profitMarginPct}%`,
      ]),
      { rightAlignCols: [1, 2, 3, 4] }
    );
  }

  const { wastageTrend, wastageByIngredient } = result.data;

  if (wastageTrend.points.length > 0) {
    pdf.drawTable(
      wastageTrend.granularity === "month" ? "Wastage Trend (By Month)" : "Wastage Trend (By Day)",
      ["Period", "Quantity Wasted", "Cost"],
      wastageTrend.points.map((p) => [p.bucket, String(p.quantity), formatCurrency(p.cost)]),
      { rightAlignCols: [1, 2] }
    );
  }

  if (wastageByIngredient.length > 0) {
    pdf.drawTable(
      "Top Wasted Ingredients",
      ["Ingredient", "Quantity Wasted", "Cost"],
      wastageByIngredient.map((w) => [w.name, `${w.quantity} ${w.unit}`, formatCurrency(w.cost)]),
      { rightAlignCols: [2] }
    );
  }

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `profitability-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}


// ─── Sales Trends & Peak-Hour Report ────────────────────────────────

export interface SalesTrendsReportData {
  period: ReportPeriod;
  branchId: string;
  rangeStart: string;
  rangeEnd: string;
  dailyTrend: Awaited<ReturnType<typeof getSalesTrendByDay>>;
  peakHours: Awaited<ReturnType<typeof getPeakHourBreakdown>>;
}

export async function getSalesTrendsReportAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: SalesTrendsReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (!hasPermission(currentStaff.role, "view_reports")) {
    return { data: null, error: "You don't have permission to view reports." };
  }

  const { branchId } = await resolveSettingsBranch(searchParams);
  const { start, end } = getReportDateRange(period, searchParams);

  const [dailyTrend, peakHours] = await Promise.all([
    getSalesTrendByDay(currentStaff.tenantId, branchId, start, end),
    getPeakHourBreakdown(currentStaff.tenantId, branchId, start, end),
  ]);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      dailyTrend,
      peakHours,
    },
  };
}

export async function exportSalesTrendsReportExcelAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getSalesTrendsReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { dailyTrend, peakHours, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Sales Trends Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Daily Trend",
    ["Date", "Revenue", "Orders"],
    dailyTrend.map((r) => [r.date, formatCurrency(r.revenue), String(r.orderCount)]),
    { rightAlignCols: [1, 2] }
  );

  workbook.addTable(
    "Peak Hours",
    ["Hour", "Revenue", "Orders"],
    peakHours.map((r) => [`${r.hour}:00`, formatCurrency(r.revenue), String(r.orderCount)]),
    { rightAlignCols: [1, 2] }
  );

  return {
    data: await workbook.toBase64(),
    filename: `sales-trends-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function exportSalesTrendsReportPdfAction(
  period: ReportPeriod,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getSalesTrendsReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { dailyTrend, peakHours, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Sales Trends Report", rangeStart, rangeEnd);

  pdf.drawKeyValueSection(
    "Daily Trend",
    dailyTrend.map((r) => ({ label: r.date, value: `${formatCurrency(r.revenue)} · ${r.orderCount} orders` }))
  );

  pdf.drawKeyValueSection(
    "Peak Hours",
    peakHours.map((r) => ({ label: `${r.hour}:00`, value: `${formatCurrency(r.revenue)} · ${r.orderCount} orders` }))
  );

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `sales-trends-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}


// ─── Branch Comparison Report (SUPER_ADMIN only) ────────────────────

export interface BranchComparisonReportData {
  period: ReportPeriod;
  rangeStart: string;
  rangeEnd: string;
  branches: Awaited<ReturnType<typeof getBranchComparison>>;
}

export async function getBranchComparisonReportAction(
  period: ReportPeriod,
  searchParams?: Record<string, string | string[] | undefined>
): Promise<{ data: BranchComparisonReportData; error?: undefined } | { data: null; error: string }> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) return { data: null, error: "Not authenticated." };
  if (currentStaff.role !== "SUPER_ADMIN") {
    return { data: null, error: "Branch comparison is only available to Super Admin." };
  }

  const { start, end } = getReportDateRange(period, searchParams);

  const tenantBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, currentStaff.tenantId),
  });
  const branchIds = tenantBranches.map((b) => b.id);

  let rows = await getBranchComparison(currentStaff.tenantId, branchIds, start, end);
  // Backfill names for zero-order branches — the join in getBranchComparison
  // has nothing to name them from.
  rows = rows.map((r) => ({
    ...r,
    branchName: r.branchName || tenantBranches.find((b) => b.id === r.branchId)?.name || "Unknown",
  }));

  return {
    data: {
      period,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      branches: rows,
    },
  };
}

export async function exportBranchComparisonReportExcelAction(
  period: ReportPeriod,
  searchParams?: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getBranchComparisonReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { branches: rows, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Branch Comparison Report", rangeStart, rangeEnd);

  workbook.addTable(
    "By Branch",
    ["Branch", "Revenue", "Orders", "Avg Order Value"],
    rows.map((r) => [
      r.branchName,
      formatCurrency(r.revenue),
      r.orderCount,
      formatCurrency(r.averageOrderValue),
    ]),
    { rightAlignCols: [1, 2, 3] }
  );

  return {
    data: await workbook.toBase64(),
    filename: `branch-comparison-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function exportBranchComparisonReportPdfAction(
  period: ReportPeriod,
  searchParams?: Record<string, string | string[] | undefined>
): Promise<{ data: string; filename: string; error?: undefined } | { data: null; error: string }> {
  const result = await getBranchComparisonReportAction(period, searchParams);
  if (!result.data) return { data: null, error: result.error };

  const { branches: rows, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Branch Comparison Report", rangeStart, rangeEnd);

  pdf.drawTable(
    "By Branch",
    ["Branch", "Revenue", "Orders", "Avg Order Value"],
    rows.map((r) => [
      r.branchName,
      formatCurrency(r.revenue),
      String(r.orderCount),
      formatCurrency(r.averageOrderValue),
    ]),
    { rightAlignCols: [1, 2, 3] }
  );

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `branch-comparison-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}