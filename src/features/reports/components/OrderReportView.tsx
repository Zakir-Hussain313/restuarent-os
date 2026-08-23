"use client";
import { useEffect, useState } from "react";
import {
  getOrderReportAction,
  exportOrderReportExcelAction,
  exportOrderReportPdfAction,
  type OrderReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2, ShoppingBag, XCircle, Percent } from "lucide-react";
import { ExportButtons } from "./ExportButtons";

interface OrderReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

const STAT_STYLES = [
  { icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
  { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  { icon: Percent, color: "text-violet-600", bg: "bg-violet-50" },
];

export function OrderReportView({ branchId, period }: OrderReportViewProps) {
  const [report, setReport] = useState<OrderReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getOrderReportAction(period, { branch: branchId }).then((result) => {
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
    { label: "Total Orders", value: String(report.summary.totalOrders) },
    { label: "Cancelled", value: String(report.summary.cancelledOrders) },
    { label: "Cancellation Rate", value: `${report.summary.cancellationRate}%` },
  ];

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportOrderReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportOrderReportPdfAction(period, { branch: branchId })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <h3 className="text-sm font-semibold text-foreground mb-3">By Status</h3>
          <div className="divide-y divide-border">
            {report.byStatus.map((r) => (
              <div key={r.status} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{STATUS_LABELS[r.status] ?? r.status}</span>
                <span className="text-sm font-medium text-foreground">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">By Order Type</h3>
          <div className="divide-y divide-border">
            {report.byType.map((r) => (
              <div key={r.orderType} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{TYPE_LABELS[r.orderType] ?? r.orderType}</span>
                <span className="text-sm font-medium text-foreground">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}