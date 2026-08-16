"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { branchChannel } from "@/lib/realtime/channels";
import { useAuthStore } from "@/store/useAuthStore";

export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const currentStaff = useAuthStore((s) => s.currentStaff);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const branchId = currentStaff?.branchId;

  useEffect(() => {
    if (!isHydrated || !branchId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(branchChannel(branchId, "orders"))
      .on("broadcast", { event: "changed" }, () => {
        queryClient.invalidateQueries({ queryKey: ["orders", undefined] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHydrated, branchId, queryClient]);
}