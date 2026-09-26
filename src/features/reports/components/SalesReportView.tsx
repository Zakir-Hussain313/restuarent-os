"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getSalesReportAction,
  exportSalesReportExcelAction,
  exportSalesReportPdfAction,
  getSalesTrendsReportAction,
  type SalesReportData,
  type SalesTrendsReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2, DollarSign, ShoppingBag, Receipt, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { ExportButtons } from "./ExportButtons";

interface SalesReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

const STAT_STYLES = [
  { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Receipt, color: "text-orange-600", bg: "bg-orange-50" },
  { icon: Tag, color: "text-violet-600", bg: "bg-violet-50" },
];

export function SalesReportView({ branchId, period }: SalesReportViewProps) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [trends, setTrends] = useState<SalesTrendsReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const params = { branch: branchId, ...(start && end ? { start, end } : {}) };

    Promise.all([
      getSalesReportAction(period, params),
      getSalesTrendsReportAction(period, params),
    ]).then(([salesResult, trendsResult]) => {
      if (ignore) return;
      if (!salesResult.data) {
        setError(salesResult.error);
      } else {
        setReport(salesResult.data);
        if (trendsResult.data) setTrends(trendsResult.data);
      }
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [branchId, period, start, end]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !report) {
    return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
  }

  const stats = [
    { label: "Total Revenue", value: formatCurrency(report.summary.totalRevenue) },
    { label: "Completed Orders", value: String(report.summary.totalOrders) },
    { label: "Avg Order Value", value: formatCurrency(report.summary.averageOrderValue) },
    { label: "Total Discount", value: formatCurrency(report.summary.totalDiscount) },
  ];

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportSalesReportExcelAction(period, { branch: branchId, ...(start && end ? { start, end } : {}) })}
        onExportPdf={() => exportSalesReportPdfAction(period, { branch: branchId, ...(start && end ? { start, end } : {}) })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const { icon: Icon, color, bg } = STAT_STYLES[i];
          return (
            <div
              key={stat.label}
              className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <span className="text-2xl font-heading font-bold text-foreground tracking-tight">
                {stat.value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Payment Method</h3>
          <div className="divide-y divide-border">
            {report.byPaymentMethod.map((r) => (
              <div key={r.method} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground capitalize">{r.method}</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(r.amount)}</span>
              </div>
            ))}
            {report.byPaymentMethod.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No data for this period.</p>
            )}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Order Type</h3>
          <div className="divide-y divide-border">
            {report.byOrderType.map((r) => (
              <div key={r.orderType} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground capitalize">{r.orderType.replace(/_/g, " ")}</span>
                <span className="text-sm font-medium text-foreground">
                  {r.count} · {formatCurrency(r.revenue)}
                </span>
              </div>
            ))}
            {report.byOrderType.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No data for this period.</p>
            )}
          </div>
        </div>
      </div>

      {trends && (
        <>
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Over Time</h3>
            {trends.dailyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.dailyTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edebf4" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#9c96a8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: string) =>
                        new Date(val).toLocaleDateString(RESTAURANT_CONFIG.locale, { month: "short", day: "numeric" })
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9c96a8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Line type="monotone" dataKey="revenue" stroke="#5B21B6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Hour of Day</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Array.from({ length: 24 }, (_, hour) => {
                    const match = trends.peakHours.find((p) => p.hour === hour);
                    return { hour, revenue: match?.revenue ?? 0, orderCount: match?.orderCount ?? 0 };
                  })}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#edebf4" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11, fill: "#9c96a8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(h: number) => `${h}:00`}
                    interval={1}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9c96a8" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v, name) => (name === "orderCount" ? [Number(v), "Orders"] : [formatCurrency(Number(v)), "Revenue"])}
                    labelFormatter={(h) => `${h}:00`}
                  />
                  <Bar dataKey="orderCount" fill="#5B21B6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}