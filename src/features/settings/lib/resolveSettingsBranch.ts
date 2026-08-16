import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { branches } from "@/db/schema";
import { getCurrentStaff } from "@/features/auth/actions";

export type SettingsBranchContext = {
  branchId: string;
  isSuperAdmin: boolean;
  branches: { id: string; name: string }[] | null; // populated only for SUPER_ADMIN
};

export async function resolveSettingsBranch(
  searchParams: Record<string, string | string[] | undefined>
): Promise<SettingsBranchContext> {
  const currentStaff = await getCurrentStaff();

  if (!currentStaff || !["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
    redirect("/dashboard");
  }

  if (currentStaff.role === "ADMIN") {
    if (!currentStaff.branchId) {
      // Admin with no branch assigned — nothing valid to show.
      redirect("/dashboard");
    }
    return {
      branchId: currentStaff.branchId,
      isSuperAdmin: false,
      branches: null,
    };
  }

  // SUPER_ADMIN — resolve from ?branch=, fall back to the tenant's main branch.
  const tenantBranches = await db.query.branches.findMany({
    where: eq(branches.tenantId, currentStaff.tenantId),
  });

  const requestedBranchId =
    typeof searchParams.branch === "string" ? searchParams.branch : undefined;
  const requestedIsValid = requestedBranchId
    ? tenantBranches.some((b) => b.id === requestedBranchId)
    : false;

  const mainBranch = tenantBranches.find((b) => b.isMainBranch);
  const branchId = requestedIsValid
    ? requestedBranchId!
    : mainBranch?.id ?? tenantBranches[0]?.id;

  if (!branchId) {
    // Tenant has no branches at all — edge case, bail out.
    redirect("/dashboard");
  }

  return {
    branchId,
    isSuperAdmin: true,
    branches: tenantBranches.map((b) => ({ id: b.id, name: b.name })),
  };
}