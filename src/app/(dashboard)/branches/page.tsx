import { getBranchListAction } from "@/features/branches/actions";
import { BranchDialog } from "@/features/branches/components/branch-dialog";
import { BranchesTable } from "@/features/branches/components/branches-table";

export default async function BranchesPage() {
  const { branches, error } = await getBranchListAction();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a1814]">Branches</h1>
          <p className="text-sm text-[#8a8680] mt-1">
            Manage your restaurant locations
          </p>
        </div>
        <BranchDialog />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <BranchesTable branches={branches ?? []} />
      )}
    </div>
  );
}