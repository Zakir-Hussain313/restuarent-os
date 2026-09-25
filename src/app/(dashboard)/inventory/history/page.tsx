import {
  getIngredientsAction,
  getSuppliersAction,
  getStockMovementsAction,
} from "@/features/inventory/actions";
import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { StockHistoryTables } from "@/features/inventory/components/stock-history-tables";
import { ReceiveStockDialog } from "@/features/inventory/components/receive-stock-dialog";
import { AdjustStockDialog } from "@/features/inventory/components/adjust-stock-dialog";

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await resolveSettingsBranch(resolvedSearchParams);

  const [ingredientsResult, suppliersResult, movementsResult] =
    await Promise.all([
      getIngredientsAction(context.branchId),
      getSuppliersAction(),
      getStockMovementsAction({ branchId: context.branchId }),
    ]);

  const ingredients = ingredientsResult.data ?? [];
  const suppliers = suppliersResult.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Stock History</h2>
          <p className="text-sm text-muted-foreground">Ledger and receipts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SettingsBranchHeader context={context} />
          <AdjustStockDialog ingredients={ingredients} />
          <ReceiveStockDialog ingredients={ingredients} suppliers={suppliers} />
        </div>
      </div>

      {ingredientsResult.error || movementsResult.error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {ingredientsResult.error ?? movementsResult.error}
        </div>
      ) : (
        <StockHistoryTables movements={movementsResult.data ?? []} />
      )}
    </div>
  );
}