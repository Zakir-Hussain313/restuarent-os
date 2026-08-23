"use client";

import { useEffect, useState } from "react";
import {
  getSalesReportAction,
  exportSalesReportExcelAction,
  exportSalesReportPdfAction,
  type SalesReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2, DollarSign, ShoppingBag, Receipt, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getSalesReportAction(period, { branch: branchId }).then((result) => {
      if (ignore) return;
      if (!result.data) {
        setError(result.error);
      } else {
        setReport(result.data);
      }
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [branchId, period]);

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
        onExportExcel={() => exportSalesReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportSalesReportPdfAction(period, { branch: branchId })}
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
    </div>
  );
}