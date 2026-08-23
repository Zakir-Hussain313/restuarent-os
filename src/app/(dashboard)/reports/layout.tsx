import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { ReportsTabs } from "@/features/reports/components/ReportsTabs";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentStaff = await getCurrentStaff();

  if (!currentStaff || !hasPermission(currentStaff.role, "view_reports")) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-[#8a8680] mt-1">
          Sales, orders, menu, and staff performance
        </p>
      </div>

      <ReportsTabs />

      <div>{children}</div>
    </div>
  );
}