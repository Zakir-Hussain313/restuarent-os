"use client";
import { useEffect, useState } from "react";
import {
  getOrderReportAction,
  exportOrderReportExcelAction,
  exportOrderReportPdfAction,
  type OrderReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2 } from "lucide-react";
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
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8680]" />
      </div>
    );
  }
  if (error || !report) {
    return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
  }
  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportOrderReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportOrderReportPdfAction(period, { branch: branchId })}
      />
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Total Orders</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.summary.totalOrders}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Cancelled</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.summary.cancelledOrders}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Cancellation Rate</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.summary.cancellationRate}%</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1814] mb-2">By Status</h3>
          <div className="space-y-1">
            {report.byStatus.map((r) => (
              <div key={r.status} className="flex justify-between text-sm">
                <span className="text-[#8a8680]">{STATUS_LABELS[r.status] ?? r.status}</span>
                <span className="text-[#1a1814]">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1a1814] mb-2">By Order Type</h3>
          <div className="space-y-1">
            {report.byType.map((r) => (
              <div key={r.orderType} className="flex justify-between text-sm">
                <span className="text-[#8a8680]">{TYPE_LABELS[r.orderType] ?? r.orderType}</span>
                <span className="text-[#1a1814]">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}