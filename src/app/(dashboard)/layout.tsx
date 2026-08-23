import { DashboardShell } from "@/components/layout/DashboardShell";
import { getCurrentStaff } from "@/features/auth/actions";
import { DashboardProviders } from "./providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentStaff = await getCurrentStaff();

  // currentStaff will be null if unauthenticated or no matching staff row.
  // DashboardShell renders fine with null — but whether an unauthenticated
  // user should even reach this layout is a middleware/route-guard concern,
  // not this file's job. Still open from the Step 9 deferred list.
  return (
    <DashboardProviders>
      <DashboardShell currentStaff={currentStaff}>{children}</DashboardShell>
    </DashboardProviders>
  );
}