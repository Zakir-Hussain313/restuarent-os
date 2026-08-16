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
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8680]" />
      </div>
    );
  }
  if (error || !report) {
    return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
  }
  if (report.topSellers.length === 0) {
    return (
      <p className="text-sm text-[#8a8680] py-8 text-center">
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
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1814] mb-2">Top Sellers</h3>
          <div className="space-y-1">
            {report.topSellers.map((item, i) => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-[#8a8680]">
                  {i + 1}. {item.name} <span className="text-xs">({item.categoryName})</span>
                </span>
                <span className="text-[#1a1814]">
                  {item.quantitySold} sold · {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {report.worstSellers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#1a1814] mb-2">Worst Sellers</h3>
            <div className="space-y-1">
              {report.worstSellers.map((item) => (
                <div key={item.menuItemId} className="flex justify-between text-sm">
                  <span className="text-[#8a8680]">
                    {item.name} <span className="text-xs">({item.categoryName})</span>
                  </span>
                  <span className="text-[#1a1814]">
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