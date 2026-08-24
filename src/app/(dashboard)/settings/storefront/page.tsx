import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/features/auth/actions";
import { getBranchesAction } from "@/features/staff/actions";
import { WebsiteBranchSelector } from "@/features/settings/components/WebsiteBranchSelector";

export default async function StorefrontSettingsPage() {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "SUPER_ADMIN") {
    redirect("/settings/pos");
  }

  const result = await getBranchesAction();
  const branches = result.branches;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Storefront</h2>
        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
          Control what customers see on the public website
        </p>
      </div>
      <WebsiteBranchSelector branches={branches} />
    </div>
  );
}