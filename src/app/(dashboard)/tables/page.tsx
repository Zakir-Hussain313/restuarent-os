import { getReservationsAction } from "@/features/reservations/actions";
import { getTablesAction, getTableSectionsAction } from "@/features/tables/actions";
import { getCurrentStaff } from "@/features/auth/actions";
import { TablesPageClient } from "@/features/tables/components/TablesPageClient";

export default async function TablesPage() {
  const [currentStaff, reservationsResult, tablesResult, sectionsResult] =
    await Promise.all([
      getCurrentStaff(),
      getReservationsAction(),
      getTablesAction(),
      getTableSectionsAction(),
    ]);

  const canManageCrud =
    currentStaff?.role === "ADMIN" || currentStaff?.role === "SUPER_ADMIN";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Tables</h1>
        <p className="text-sm text-[#8a8680] mt-1">
          Manage reservations and your floor plan
        </p>
      </div>

      <TablesPageClient
        reservations={reservationsResult.data ?? []}
        reservationsError={reservationsResult.error}
        tables={tablesResult.data ?? []}
        tablesError={tablesResult.error}
        sections={sectionsResult.data ?? []}
        sectionsError={sectionsResult.error}
        branchId={currentStaff?.branchId ?? undefined}
        canManageCrud={canManageCrud}
      />
    </div>
  );
}