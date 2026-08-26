"use client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { branchChannel, type RealtimeResource } from "./channels";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

type Entry = {
  channel: ReturnType<ReturnType<typeof getSupabaseBrowserClient>["channel"]> | null;
  listeners: Set<() => void>;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  cancelled: boolean;
};

const registry = new Map<string, Entry>();

function connect(topic: string) {
  const entry = registry.get(topic);
  if (!entry || entry.cancelled) return;
  const supabase = getSupabaseBrowserClient();

  entry.channel = supabase
    .channel(topic)
    .on("broadcast", { event: "changed" }, () => {
      entry.listeners.forEach((fn) => fn());
    })
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        entry.reconnectAttempt = 0;
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (entry.cancelled) return;
        if (!entry.channel) return; // reentrancy guard
        const stale = entry.channel;
        entry.channel = null;
        const delay = Math.min(
          RECONNECT_DELAY_MS * 2 ** entry.reconnectAttempt,
          MAX_RECONNECT_DELAY_MS
        );
        entry.reconnectAttempt += 1;
        supabase.removeChannel(stale);
        entry.reconnectTimer = setTimeout(() => connect(topic), delay);
      }
    });
}

/** Subscribe to a branch/resource topic. Returns an unsubscribe function. */
export function subscribeBranchChannel(
  branchId: string,
  resource: RealtimeResource,
  onEvent: () => void
): () => void {
  const topic = branchChannel(branchId, resource);
  let entry = registry.get(topic);

  if (!entry) {
    entry = {
      channel: null,
      listeners: new Set(),
      reconnectAttempt: 0,
      reconnectTimer: null,
      cancelled: false,
    };
    registry.set(topic, entry);
    connect(topic);
  }

  entry.listeners.add(onEvent);

  return () => {
    const e = registry.get(topic);
    if (!e) return;
    e.listeners.delete(onEvent);
    if (e.listeners.size === 0) {
      e.cancelled = true;
      if (e.reconnectTimer) clearTimeout(e.reconnectTimer);
      if (e.channel) getSupabaseBrowserClient().removeChannel(e.channel);
      registry.delete(topic);
    }
  };
}