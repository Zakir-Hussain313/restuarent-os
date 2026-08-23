"use client";
import { useEffect, useState } from "react";
import {
  getMenuPerformanceReportAction,
  exportMenuPerformanceReportExcelAction,
  exportMenuPerformanceReportPdfAction,
  type MenuPerformanceReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ExportButtons } from "./ExportButtons";

interface MenuPerformanceReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

export function MenuPerformanceReportView({ branchId, period }: MenuPerformanceReportViewProps) {
  const [report, setReport] = useState<MenuPerformanceReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getMenuPerformanceReportAction(period, { branch: branchId }).then((result) => {
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

  if (report.topSellers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No completed orders in this period yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportMenuPerformanceReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportMenuPerformanceReportPdfAction(period, { branch: branchId })}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Sellers</h3>
          <div className="divide-y divide-border">
            {report.topSellers.map((item, i) => (
              <div key={item.menuItemId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">
                  {i + 1}. {item.name} <span className="text-xs">({item.categoryName})</span>
                </span>
                <span className="text-sm font-medium text-foreground shrink-0">
                  {item.quantitySold} sold · {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {report.worstSellers.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Worst Sellers</h3>
            <div className="divide-y divide-border">
              {report.worstSellers.map((item) => (
                <div key={item.menuItemId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm text-muted-foreground">
                    {item.name} <span className="text-xs">({item.categoryName})</span>
                  </span>
                  <span className="text-sm font-medium text-foreground shrink-0">
                    {item.quantitySold} sold · {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}