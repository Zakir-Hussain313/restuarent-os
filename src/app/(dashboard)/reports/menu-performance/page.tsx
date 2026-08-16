import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { ReportPeriodFilter } from "@/features/reports/components/ReportPeriodFilter";
import { MenuPerformanceReportView } from "@/features/reports/components/MenuPerformanceReportView";
import type { ReportPeriod } from "@/features/reports/lib/getReportDateRange";

const VALID_PERIODS: ReportPeriod[] = ["today", "week", "month", "last_month"];

export default async function MenuPerformanceReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await resolveSettingsBranch(resolvedSearchParams);

  const requestedPeriod = resolvedSearchParams.period;
  const period: ReportPeriod =
    typeof requestedPeriod === "string" && VALID_PERIODS.includes(requestedPeriod as ReportPeriod)
      ? (requestedPeriod as ReportPeriod)
      : "month";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1814]">Menu Performance</h2>
          <p className="text-sm text-[#8a8680] mt-1">
            Best and worst selling items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReportPeriodFilter selectedPeriod={period} />
          <SettingsBranchHeader context={context} />
        </div>
      </div>

      <MenuPerformanceReportView branchId={context.branchId} period={period} />
    </div>
  );
}