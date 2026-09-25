import { getSuppliersAction } from "@/features/inventory/actions";
import { SuppliersTable } from "@/features/inventory/components/suppliers-table";
import { SupplierDialog } from "@/features/inventory/components/supplier-dialog";

export default async function SuppliersPage() {
  const { data, error } = await getSuppliersAction();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Suppliers</h2>
          <p className="text-sm text-muted-foreground">Shared across all branches</p>
        </div>
        <SupplierDialog />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <SuppliersTable suppliers={data ?? []} />
      )}
    </div>
  );
}