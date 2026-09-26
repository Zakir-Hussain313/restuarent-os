import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/features/auth/actions";
import { ReportPeriodFilter } from "@/features/reports/components/ReportPeriodFilter";
import { BranchComparisonReportView } from "@/features/reports/components/BranchComparisonReportView";
import { ALL_REPORT_PERIODS, type ReportPeriod } from "@/features/reports/lib/getReportDateRange";

export default async function BranchComparisonReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "SUPER_ADMIN") {
    redirect("/reports/sales");
  }

  const resolvedSearchParams = await searchParams;
  const requestedPeriod = resolvedSearchParams.period;
  const period: ReportPeriod =
    typeof requestedPeriod === "string" && ALL_REPORT_PERIODS.includes(requestedPeriod as ReportPeriod)
      ? (requestedPeriod as ReportPeriod)
      : "month";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Branch Comparison</h2>
          <p className="text-sm text-[#8a8680] mt-1 hidden sm:block">
            Revenue and orders across all branches
          </p>
        </div>
        <ReportPeriodFilter selectedPeriod={period} />
      </div>

      <BranchComparisonReportView period={period} />
    </div>
  );
}