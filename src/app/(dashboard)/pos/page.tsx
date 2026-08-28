import type { Metadata } from "next";
import { PosLayout } from "@/features/pos";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { getCurrentStaff } from "@/features/auth/actions";
import { getPosAutoConfirmSettingAction } from "@/features/settings/actions";
import { getMyClockStatusAction } from "@/features/attendance/actions";

export const metadata: Metadata = {
  title: `POS | ${RESTAURANT_CONFIG.name}`,
  description: "Point of Sale — take orders fast",
};

export default async function PosPage() {
  const currentStaff = await getCurrentStaff();
  const branchId = currentStaff?.branchId ?? undefined;

  // Only fetch the setting if we actually have a branch to check — SUPER_ADMIN
  // using POS without a resolved branch just gets the default (off).
  const settingsResult = branchId ? await getPosAutoConfirmSettingAction(branchId) : null;
  const autoConfirmOnPlace = settingsResult?.data?.posAutoConfirmOnPlace ?? false;

  const isStaff = currentStaff?.role === "STAFF";
  const clockStatus = isStaff ? await getMyClockStatusAction() : null;
  const initialIsClockedIn = clockStatus?.isClockedIn ?? false;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <PosLayout
        branchId={branchId}
        autoConfirmOnPlace={autoConfirmOnPlace}
        showClockButton={isStaff}
        initialIsClockedIn={initialIsClockedIn}
      />
    </div>
  );
}