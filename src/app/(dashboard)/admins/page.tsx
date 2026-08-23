import { getAdminsListAction } from "@/features/admins/actions";
import { getBranchesAction } from "@/features/staff/actions";
import { AdminDialog } from "@/features/admins/components/AdminDialog";
import { AdminCards } from "@/features/admins/components/AdminCards";
import { getCurrentStaff } from "@/features/auth/actions";

export default async function AdminsPage() {
  const [{ admins, error: adminsError }, { branches, error: branchError }, currentStaff] =
    await Promise.all([getAdminsListAction(), getBranchesAction(), getCurrentStaff()]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admins</h1>
          <p className="text-sm text-[#8a8680] mt-1">
            Manage branch admins and super admins
          </p>
        </div>
        <AdminDialog branches={branches ?? []} currentUserId={currentStaff?.id ?? ""} />
      </div>

      {adminsError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {adminsError}
        </div>
      ) : (
        <AdminCards
          admins={admins ?? []}
          branches={branches ?? []}
          currentUserId={currentStaff?.id ?? ""}
        />
      )}

      {branchError && (
        <p className="text-xs text-[#b0ada8]">
          Note: couldn&apos;t load branches ({branchError})
        </p>
      )}
    </div>
  );
}