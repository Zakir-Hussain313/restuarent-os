import { getIngredientsAction } from "@/features/inventory/actions";
import { resolveSettingsBranch } from "@/features/settings/lib/resolveSettingsBranch";
import { SettingsBranchHeader } from "@/features/settings/components/SettingsBranchHeader";
import { IngredientsTable } from "@/features/inventory/components/ingredients-table";
import { IngredientDialog } from "@/features/inventory/components/ingredient-dialog";

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await resolveSettingsBranch(resolvedSearchParams);

  const { data, error } = await getIngredientsAction(context.branchId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Ingredients</h2>
          <p className="text-sm text-muted-foreground">Stock levels and low-stock alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsBranchHeader context={context} />
          <IngredientDialog branchId={context.branchId} />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <IngredientsTable ingredients={data ?? []} />
      )}
    </div>
  );
}