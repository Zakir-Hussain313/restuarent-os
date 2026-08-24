import { getReservationsAction } from "@/features/reservations/actions";
import { getTablesAction, getTableSectionsAction } from "@/features/tables/actions";
import { getCurrentStaff } from "@/features/auth/actions";
import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { TablesPageClient } from "@/features/tables/components/TablesPageClient";

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [currentStaff, context] = await Promise.all([
    getCurrentStaff(),
    resolveSettingsBranch(resolvedSearchParams),
  ]);

  const [reservationsResult, tablesResult, sectionsResult] = await Promise.all([
    getReservationsAction(context.branchId),
    getTablesAction(context.branchId),
    getTableSectionsAction(context.branchId),
  ]);

  const canManageCrud =
    currentStaff?.role === "ADMIN" || currentStaff?.role === "SUPER_ADMIN";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tables</h1>
          <p className="text-sm text-[#8a8680] mt-1">
            Manage reservations and your floor plan
          </p>
        </div>
        <SettingsBranchHeader context={context} />
      </div>

      <TablesPageClient
        reservations={reservationsResult.data ?? []}
        reservationsError={reservationsResult.error}
        tables={tablesResult.data ?? []}
        tablesError={tablesResult.error}
        sections={sectionsResult.data ?? []}
        sectionsError={sectionsResult.error}
        branchId={context.branchId}
        canManageCrud={canManageCrud}
      />
    </div>
  );
}