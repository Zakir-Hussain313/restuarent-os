import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/features/auth/actions";
import { SettingsTabs } from "@/features/settings/components/SettingsTabs";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentStaff = await getCurrentStaff();

  if (!currentStaff || !["ADMIN", "SUPER_ADMIN"].includes(currentStaff.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1a1814]">Settings</h1>
        <p className="text-sm text-[#8a8680] mt-1">
          Manage branch configuration and preferences
        </p>
      </div>

      <SettingsTabs />

      <div>{children}</div>
    </div>
  );
}