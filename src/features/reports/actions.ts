// src/features/reports/actions.ts
"use server";

import { getSalesSummary, getSalesByPaymentMethod, getSalesByOrderType } from "./lib/salesQueries";
import { getReportDateRange, type ReportPeriod } from "./lib/getReportDateRange";
import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types";
import { getOrderReportSummary, getOrdersByStatus, getOrdersByType } from "./lib/orderQueries";
import { getMenuItemPerformance, splitTopAndBottom } from "./lib/menuPerformanceQueries";
import { getStaffAttendanceBreakdown, getAttendanceTotals } from "./lib/attendanceQueries";
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

  const { start, end } = getReportDateRange(period);

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
  const { start, end } = getReportDateRange(period);

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
  const { start, end } = getReportDateRange(period);

  const items = await getMenuItemPerformance(currentStaff.tenantId, branchId, start, end);
  const { topSellers, worstSellers } = splitTopAndBottom(items);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      topSellers,
      worstSellers,
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
  const { start, end } = getReportDateRange(period);

  const byStaff = await getStaffAttendanceBreakdown(currentStaff.tenantId, branchId, start, end);
  const totals = getAttendanceTotals(byStaff);

  return {
    data: {
      period,
      branchId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      byStaff,
      totals,
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

  const { topSellers, worstSellers, rangeStart, rangeEnd } = result.data;

  const workbook = await createReportWorkbook("Menu Performance Report", rangeStart, rangeEnd);

  workbook.addTable(
    "Top Sellers",
    ["Rank", "Item", "Category", "Quantity Sold", "Revenue"],
    topSellers.map((item, i) => [
      i + 1,
      item.name,
      item.categoryName,
      item.quantitySold,
      formatCurrency(item.revenue),
    ]),
    { rightAlignCols: [0, 3, 4] }
  );

  if (worstSellers.length > 0) {
    workbook.addTable(
      "Worst Sellers",
      ["Item", "Category", "Quantity Sold", "Revenue"],
      worstSellers.map((item) => [
        item.name,
        item.categoryName,
        item.quantitySold,
        formatCurrency(item.revenue),
      ]),
      { rightAlignCols: [2, 3] }
    );
  }

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

  const { topSellers, worstSellers, rangeStart, rangeEnd } = result.data;

  const pdf = await createReportPdf("Menu Performance Report", rangeStart, rangeEnd);

  pdf.drawTable(
    "Top Sellers",
    ["Rank", "Item", "Category", "Qty Sold", "Revenue"],
    topSellers.map((item, i) => [
      String(i + 1),
      item.name,
      item.categoryName,
      String(item.quantitySold),
      formatCurrency(item.revenue),
    ]),
    { rightAlignCols: [0, 3, 4] }
  );

  if (worstSellers.length > 0) {
    pdf.drawTable(
      "Worst Sellers",
      ["Item", "Category", "Qty Sold", "Revenue"],
      worstSellers.map((item) => [
        item.name,
        item.categoryName,
        String(item.quantitySold),
        formatCurrency(item.revenue),
      ]),
      { rightAlignCols: [2, 3] }
    );
  }

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

  const { totals, byStaff, rangeStart, rangeEnd } = result.data;

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

  const { totals, byStaff, rangeStart, rangeEnd } = result.data;

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

  const pdfBytes = await pdf.save();

  return {
    data: pdfBytesToBase64(pdfBytes),
    filename: `attendance-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}