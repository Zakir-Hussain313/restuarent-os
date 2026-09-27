"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  getProfitabilityReportAction,
  exportProfitabilityReportExcelAction,
  exportProfitabilityReportPdfAction,
  type ProfitabilityReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2, DollarSign, TrendingDown, TrendingUp, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { ExportButtons } from "./ExportButtons";

interface ProfitabilityReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

const STAT_STYLES = [
  { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
  { icon: TrendingUp, color: "text-primary", bg: "bg-primary-light" },
  { icon: PieChart, color: "text-orange-600", bg: "bg-orange-50" },
];

export function ProfitabilityReportView({ branchId, period }: ProfitabilityReportViewProps) {
  const searchParams = useSearchParams();
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const [report, setReport] = useState<ProfitabilityReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getProfitabilityReportAction(period, { branch: branchId, ...(start && end ? { start, end } : {}) }).then((result) => {
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

  const { summary } = report;

  const stats = [
    { label: "Revenue", value: formatCurrency(summary.revenue) },
    { label: "Ingredient Cost", value: formatCurrency(summary.cogs) },
    { label: "Net Profit", value: formatCurrency(summary.netProfit) },
    { label: "Food Cost %", value: `${summary.foodCostPct}%` },
  ];

  const breakdown = [
    { label: "Revenue", value: formatCurrency(summary.revenue) },
    { label: "Ingredient Cost", value: `-${formatCurrency(summary.cogs)}` },
    { label: "Gross Profit", value: formatCurrency(summary.grossProfit) },
    { label: "Wastage Loss", value: `-${formatCurrency(summary.wastageLoss)}` },
    { label: "Correction Loss", value: `-${formatCurrency(summary.correctionLoss)}` },
    { label: "Net Profit", value: formatCurrency(summary.netProfit) },
  ];

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportProfitabilityReportExcelAction(period, { branch: branchId, ...(start && end ? { start, end } : {}) })}
        onExportPdf={() => exportProfitabilityReportPdfAction(period, { branch: branchId, ...(start && end ? { start, end } : {}) })}
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

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Profit & Loss Breakdown</h3>
        <div className="divide-y divide-border">
          {breakdown.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="text-sm font-medium text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Net Profit Trend ({report.trend.granularity === "month" ? "By Month" : "By Day"})
        </h3>
        {report.trend.points.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.trend.points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edebf4" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 11, fill: "#9c96a8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: string) =>
                    report.trend.granularity === "month"
                      ? new Date(`${val}-01`).toLocaleDateString(RESTAURANT_CONFIG.locale, { month: "short", year: "numeric" })
                      : new Date(val).toLocaleDateString(RESTAURANT_CONFIG.locale, { month: "short", day: "numeric" })
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9c96a8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value, name, props) =>
                    name === "netProfit"
                      ? [`${formatCurrency(Number(value))} (${props.payload.profitMarginPct}% margin)`, "Net Profit"]
                      : [formatCurrency(Number(value)), name]
                  }
                />
                <Line type="monotone" dataKey="netProfit" stroke="#5B21B6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Wastage Trend ({report.wastageTrend.granularity === "month" ? "By Month" : "By Day"})
          </h3>
          {report.wastageTrend.points.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No wastage recorded this period.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.wastageTrend.points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edebf4" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11, fill: "#9c96a8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) =>
                      report.wastageTrend.granularity === "month"
                        ? new Date(`${val}-01`).toLocaleDateString(RESTAURANT_CONFIG.locale, { month: "short", year: "numeric" })
                        : new Date(val).toLocaleDateString(RESTAURANT_CONFIG.locale, { month: "short", day: "numeric" })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9c96a8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="cost" fill="#F97362" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Wasted Ingredients</h3>
          <div className="divide-y divide-border">
            {report.wastageByIngredient.slice(0, 10).map((w) => (
              <div key={w.ingredientId} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{w.name}</span>
                <span className="text-sm font-medium text-foreground">
                  {w.quantity} {w.unit} · {formatCurrency(w.cost)}
                </span>
              </div>
            ))}
            {report.wastageByIngredient.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No wastage recorded this period.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}