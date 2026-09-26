"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  getBranchComparisonReportAction,
  exportBranchComparisonReportExcelAction,
  exportBranchComparisonReportPdfAction,
  type BranchComparisonReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ExportButtons } from "./ExportButtons";

interface BranchComparisonReportViewProps {
  period: ReportPeriod;
}

export function BranchComparisonReportView({ period }: BranchComparisonReportViewProps) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const [report, setReport] = useState<BranchComparisonReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getBranchComparisonReportAction(period, start && end ? { start, end } : undefined).then((result) => {
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
  }, [period, start, end]);

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

  const { branches } = report;

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportBranchComparisonReportExcelAction(period, start && end ? { start, end } : undefined)}
        onExportPdf={() => exportBranchComparisonReportPdfAction(period, start && end ? { start, end } : undefined)}
      />

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Revenue by Branch</h3>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No branches found.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branches} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edebf4" vertical={false} />
                <XAxis dataKey="branchName" tick={{ fontSize: 11, fill: "#9c96a8" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9c96a8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="revenue" fill="#5B21B6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Branch Breakdown</h3>
        <div className="divide-y divide-border">
          {branches.map((b) => (
            <div key={b.branchId} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-muted-foreground">{b.branchName}</span>
              <span className="text-sm font-medium text-foreground">
                {b.orderCount} orders · {formatCurrency(b.revenue)} · avg {formatCurrency(b.averageOrderValue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}