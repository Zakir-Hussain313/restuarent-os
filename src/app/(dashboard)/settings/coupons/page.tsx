import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { CouponsLayout } from "@/features/coupons/components/CouponsLayout";

export default async function CouponsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await resolveSettingsBranch(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Coupons</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage discount coupons for POS
        </p>
      </div>

      <CouponsLayout isSuperAdmin={context.isSuperAdmin} branches={context.branches} />
    </div>
  );
}