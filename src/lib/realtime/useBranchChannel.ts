"use client";

import { useEffect, useRef } from "react";
import { subscribeBranchChannel } from "@/lib/realtime/channelRegistry";
import type { RealtimeResource } from "@/lib/realtime/channels";

/**
 * Subscribes to a branch-scoped Supabase Realtime broadcast channel and
 * calls onEvent whenever a "changed" broadcast is received.
 *
 * Delegates to the shared, ref-counted channelRegistry so multiple
 * components watching the same branch/resource topic share exactly one
 * real channel and one reconnect loop (see Bug Pattern #19 — duplicate
 * per-component channels re-entering the reconnect handler caused a
 * "Maximum call stack size exceeded" RangeError).
 */
export function useBranchChannel(
  branchId: string | undefined | null,
  resource: RealtimeResource,
  onEvent: () => void
) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeBranchChannel(branchId, resource, () => {
      onEventRef.current();
    });

    return unsubscribe;
  }, [branchId, resource]);
}