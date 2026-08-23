"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { branchChannel, type RealtimeResource } from "@/lib/realtime/channels";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Subscribes to a branch-scoped Supabase Realtime broadcast channel and
 * calls onEvent whenever a "changed" broadcast is received.
 *
 * Automatically reconnects with backoff if the channel drops into
 * CHANNEL_ERROR / TIMED_OUT / CLOSED (server restart, network blip, etc.).
 * Without this, a dropped channel goes silent until the user manually
 * refreshes the page.
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

    const supabase = getSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      channel = supabase
        .channel(branchChannel(branchId!, resource))
        .on("broadcast", { event: "changed" }, () => {
          onEventRef.current();
        })
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (cancelled) return;

            const delay = Math.min(
              RECONNECT_DELAY_MS * 2 ** reconnectAttempt,
              MAX_RECONNECT_DELAY_MS
            );
            reconnectAttempt += 1;

            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }

            reconnectTimer = setTimeout(() => {
              connect();
            }, delay);
          }
        });
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [branchId, resource]);
}