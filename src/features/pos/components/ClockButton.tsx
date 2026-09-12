"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDeviceToken } from "@/lib/deviceToken";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clockInAction, clockOutAction } from "@/features/attendance/actions";
import { getBranchAttendanceMethodAction } from "@/features/devices/actions";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

interface ClockButtonProps {
  initialIsClockedIn: boolean;
  branchId?: string;
}

export function ClockButton({ initialIsClockedIn, branchId }: ClockButtonProps) {
  const [isClockedIn, setIsClockedIn] = useState(initialIsClockedIn);
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlertModal();

  // A branch with an approved fingerprint scanner uses it exclusively —
  // the POS clock-in button is hidden in favor of the scanner.
  const { data: attendanceMethod } = useQuery({
    queryKey: ["branch-attendance-method", branchId],
    queryFn: async () => {
      const res = await getBranchAttendanceMethodAction(branchId);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
  });

  async function handleClick() {
    setIsLoading(true);

    if (isClockedIn) {
      const result = await clockOutAction();
      setIsLoading(false);
      if (!result.success) {
        showAlert(result.error, "Couldn't clock out");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
      return;
    }

    const token = getDeviceToken();
    const result = await clockInAction(token);
    setIsLoading(false);
    if (!result.success) {
      showAlert(result.error, "Couldn't clock in");
      return;
    }
    setIsClockedIn(true);
  }

  if (attendanceMethod?.hasApprovedScanner) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shrink-0",
        isClockedIn
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      )}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isClockedIn ? (
        <LogOut className="w-3.5 h-3.5" />
      ) : (
        <LogIn className="w-3.5 h-3.5" />
      )}
      {isClockedIn ? "Clock Out" : "Clock In"}
    </button>
  );
}