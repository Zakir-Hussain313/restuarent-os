"use client";

import { useEffect, useState } from "react";
import {
  getAttendanceReportAction,
  exportAttendanceReportExcelAction,
  exportAttendanceReportPdfAction,
  type AttendanceReportData,
} from "@/features/reports/actions";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";
import { Loader2 } from "lucide-react";
import { ExportButtons } from "./ExportButtons";

interface AttendanceReportViewProps {
  branchId: string;
  period: ReportPeriod;
}

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
        <Loader2 className="w-5 h-5 animate-spin text-[#8a8680]" />
      </div>
    );
  }

  if (error || !report) {
    return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
  }

  if (report.byStaff.length === 0) {
    return (
      <p className="text-sm text-[#8a8680] py-8 text-center">
        No attendance records in this period yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ExportButtons
        onExportExcel={() => exportAttendanceReportExcelAction(period, { branch: branchId })}
        onExportPdf={() => exportAttendanceReportPdfAction(period, { branch: branchId })}
      />

      <div className="grid grid-cols-5 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Present</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.totals.present}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Absent</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.totals.absent}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Late</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.totals.late}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Leave</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.totals.leave}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[#8a8680]">Half Day</p>
          <p className="text-2xl font-semibold text-[#1a1814]">{report.totals.halfDay}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#1a1814] mb-2">By Staff</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#8a8680] border-b">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 px-4 font-medium text-right">Present</th>
                <th className="py-2 px-4 font-medium text-right">Absent</th>
                <th className="py-2 px-4 font-medium text-right">Late</th>
                <th className="py-2 px-4 font-medium text-right">Leave</th>
                <th className="py-2 pl-4 font-medium text-right">Half Day</th>
              </tr>
            </thead>
            <tbody>
              {report.byStaff.map((s) => (
                <tr key={s.staffId} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-[#1a1814]">{s.name}</td>
                  <td className="py-2 px-4 text-right text-[#1a1814]">{s.present}</td>
                  <td className="py-2 px-4 text-right text-[#1a1814]">{s.absent}</td>
                  <td className="py-2 px-4 text-right text-[#1a1814]">{s.late}</td>
                  <td className="py-2 px-4 text-right text-[#1a1814]">{s.leave}</td>
                  <td className="py-2 pl-4 text-right text-[#1a1814]">{s.halfDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}