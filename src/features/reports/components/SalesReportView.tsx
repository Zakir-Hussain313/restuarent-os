"use client";

import { useEffect, useState } from "react";
import {
  getSalesReportAction,
  exportSalesReportExcelAction,
  exportSalesReportPdfAction,
  type SalesReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ExportButtons } from "./ExportButtons";

interface SalesReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

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
        onExportExcel={() => exportSalesReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportSalesReportPdfAction(period, { branch: branchId })}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Total Revenue</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{formatCurrency(report.summary.totalRevenue)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Completed Orders</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.summary.totalOrders}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Avg Order Value</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{formatCurrency(report.summary.averageOrderValue)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Total Discount</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{formatCurrency(report.summary.totalDiscount)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1814] mb-2">By Payment Method</h3>
          <div className="space-y-1">
            {report.byPaymentMethod.map((r) => (
              <div key={r.method} className="flex justify-between text-sm">
                <span className="text-[#8a8680]">{r.method}</span>
                <span className="text-[#1a1814]">{formatCurrency(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1a1814] mb-2">By Order Type</h3>
          <div className="space-y-1">
            {report.byOrderType.map((r) => (
              <div key={r.orderType} className="flex justify-between text-sm">
                <span className="text-[#8a8680]">{r.orderType}</span>
                <span className="text-[#1a1814]">{r.count} · {formatCurrency(r.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}