import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { DeliveryAreasLayout } from "@/features/delivery-areas/components/DeliveryAreasLayout";

export default async function DeliveryAreasSettingsPage({
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
            Delivery Areas
          </h2>
          <p className="text-sm text-[#8a8680] mt-1">
            Manage delivery coverage for this branch
          </p>
        </div>
        <SettingsBranchHeader context={context} />
      </div>

      <DeliveryAreasLayout branchId={context.branchId} />
    </div>
  );
}