import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { getBranchSettingsAction } from "@/features/settings/actions";
import { PosSettingsForm } from "@/features/settings/components/PosSettingsForm";

export default async function PosSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveSettingsBranch(await searchParams);
  const result = await getBranchSettingsAction(context.branchId);

  if (!result.data) {
    return <p className="text-sm text-destructive">{result.error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">POS</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure point-of-sale behavior for this branch
          </p>
        </div>
        <SettingsBranchHeader context={context} />
      </div>

      <PosSettingsForm
        branchId={context.branchId}
        initialValue={result.data.posAutoConfirmOnPlace}
      />
    </div>
  );
}