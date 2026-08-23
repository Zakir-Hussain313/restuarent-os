import { getStaffListAction, getBranchesAction } from "@/features/staff/actions";
import { StaffDialog } from "@/features/staff/components/add-staff-dialog";
import { StaffFilters } from "@/features/staff/components/staff-filters";
import { getCurrentStaff } from "@/features/auth/actions";

export default async function StaffPage() {
  const [{ staff, error: staffError }, { branches, error: branchError }, currentStaff] =
    await Promise.all([getStaffListAction(), getBranchesAction(), getCurrentStaff()]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your team — staff and riders
          </p>
        </div>
        <StaffDialog branches={branches ?? []} />
      </div>

      {staffError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {staffError}
        </div>
      ) : (
        <StaffFilters
          staff={staff ?? []}
          branches={branches ?? []}
          currentUserId={currentStaff?.id ?? ""}
          currentUserRole={currentStaff?.role ?? ""}
        />
      )}

      {branchError && (
        <p className="text-xs text-muted-foreground/70">
          Note: couldn&apos;t load branches ({branchError})
        </p>
      )}
    </div>
  );
}