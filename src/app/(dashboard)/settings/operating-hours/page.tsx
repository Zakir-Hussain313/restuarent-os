import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { OperatingHoursLayout } from "@/features/operating-hours/components/OperatingHoursLayout";

export default async function OperatingHoursSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveSettingsBranch(await searchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1814]">
            Operating Hours
          </h2>
          <p className="text-sm text-[#8a8680] mt-1">
            Set when this branch is open for reservations
          </p>
        </div>
        <SettingsBranchHeader context={context} />
      </div>

      <OperatingHoursLayout branchId={context.branchId} />
    </div>
  );
}