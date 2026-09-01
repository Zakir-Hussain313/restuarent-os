import type { Metadata } from "next";
import { PosLayout } from "@/features/pos";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { getCurrentStaff } from "@/features/auth/actions";

export const metadata: Metadata = {
  title: `POS | ${RESTAURANT_CONFIG.name}`,
  description: "Point of Sale — take orders fast",
};

export default async function PosPage() {
  const currentStaff = await getCurrentStaff();
  const branchId = currentStaff?.branchId ?? undefined;
  const isStaff = currentStaff?.role === "STAFF";

  // autoConfirmOnPlace and initialIsClockedIn now come from the client-side
  // POS init bundle (usePosInit) instead of being fetched here separately.
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <PosLayout branchId={branchId} showClockButton={isStaff} />
    </div>
  );
}