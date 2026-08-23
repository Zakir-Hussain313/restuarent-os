"use client";

import { useEffect, useState } from "react";
import {
  getAttendanceReportAction,
  exportAttendanceReportExcelAction,
  exportAttendanceReportPdfAction,
  type AttendanceReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2, UserCheck, UserX, Clock, CalendarOff, Timer } from "lucide-react";
import { ExportButtons } from "./ExportButtons";

interface AttendanceReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

const STAT_STYLES = [
  { icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: UserX, color: "text-red-500", bg: "bg-red-50" },
  { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  { icon: CalendarOff, color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Timer, color: "text-violet-600", bg: "bg-violet-50" },
];

export function AttendanceReportView({ branchId, period }: AttendanceReportViewProps) {
  const [report, setReport] = useState<AttendanceReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    getAttendanceReportAction(period, { branch: branchId }).then((result) => {
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

  if (report.byStaff.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No attendance records in this period yet.
      </p>
    );
  }

  const stats = [
    { label: "Present", value: report.totals.present },
    { label: "Absent", value: report.totals.absent },
    { label: "Late", value: report.totals.late },
    { label: "Leave", value: report.totals.leave },
    { label: "Half Day", value: report.totals.halfDay },
  ];

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportAttendanceReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportAttendanceReportPdfAction(period, { branch: branchId })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <h3 className="text-sm font-semibold text-foreground px-5 pt-5 pb-3">By Staff</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2.5 pl-5 pr-4 font-medium">Name</th>
                <th className="py-2.5 px-4 font-medium text-right">Present</th>
                <th className="py-2.5 px-4 font-medium text-right">Absent</th>
                <th className="py-2.5 px-4 font-medium text-right">Late</th>
                <th className="py-2.5 px-4 font-medium text-right">Leave</th>
                <th className="py-2.5 pl-4 pr-5 font-medium text-right">Half Day</th>
              </tr>
            </thead>
            <tbody>
              {report.byStaff.map((s) => (
                <tr key={s.staffId} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 pl-5 pr-4 text-foreground font-medium">{s.name}</td>
                  <td className="py-2.5 px-4 text-right text-foreground">{s.present}</td>
                  <td className="py-2.5 px-4 text-right text-foreground">{s.absent}</td>
                  <td className="py-2.5 px-4 text-right text-foreground">{s.late}</td>
                  <td className="py-2.5 px-4 text-right text-foreground">{s.leave}</td>
                  <td className="py-2.5 pl-4 pr-5 text-right text-foreground">{s.halfDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}