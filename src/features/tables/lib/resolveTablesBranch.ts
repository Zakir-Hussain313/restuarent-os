import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { branches } from "@/db/schema";
import { getCurrentStaff } from "@/features/auth/actions";

export type TablesBranchContext = {
  branchId: string | undefined; // undefined only possible for SUPER_ADMIN with no branches at all (edge case)
  isSuperAdmin: boolean;
  branches: { id: string; name: string }[] | null; // populated only for SUPER_ADMIN
};

export async function resolveTablesBranch(
  searchParams: Record<string, string | string[] | undefined>
): Promise<TablesBranchContext> {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff) {
    redirect("/auth/login");
  }

  if (currentStaff.role !== "SUPER_ADMIN") {
    // ADMIN/STAFF/RIDER are branch-locked to their own staff row.
    return {
      branchId: currentStaff.branchId ?? undefined,
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

  return {
    branchId,
    isSuperAdmin: true,
    branches: tenantBranches.map((b) => ({ id: b.id, name: b.name })),
  };
}