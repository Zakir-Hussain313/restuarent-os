import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { ReportPeriodFilter } from "@/features/reports/components/ReportPeriodFilter";
import { ProfitabilityReportView } from "@/features/reports/components/ProfitabilityReportView";
import { ALL_REPORT_PERIODS, type ReportPeriod } from "@/features/reports/lib/getReportDateRange";

export default async function ProfitabilityReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await resolveSettingsBranch(resolvedSearchParams);

  const requestedPeriod = resolvedSearchParams.period;
  const period: ReportPeriod =
    typeof requestedPeriod === "string" && ALL_REPORT_PERIODS.includes(requestedPeriod as ReportPeriod)
      ? (requestedPeriod as ReportPeriod)
      : "month";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profitability</h2>
          <p className="text-sm text-[#8a8680] mt-1 hidden sm:block">
            Revenue, cost of goods sold, and inventory loss
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
          <ReportPeriodFilter selectedPeriod={period} />
          <SettingsBranchHeader context={context} />
        </div>
      </div>

      <ProfitabilityReportView branchId={context.branchId} period={period} />
    </div>
  );
}