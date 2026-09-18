"use client";

import { AlertTriangle } from "lucide-react";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSyncStatus";

function timeAgo(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Renders nothing when there's nothing stuck — a normally-offline-then-synced
// queue never shows this, only items that hit the retry cap and stopped
// auto-retrying (see MAX_SYNC_ATTEMPTS in offlineOrderQueue.ts).
export function StuckSyncBanner() {
  const { stuckItems } = useOfflineSyncStatus();

  if (stuckItems.length === 0) return null;

  return (
    <div className="px-6 py-3 border-b bg-destructive/5 shrink-0">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-destructive">
            {stuckItems.length} item{stuckItems.length > 1 ? "s" : ""} couldn&apos;t sync after repeated attempts
          </p>
          <ul className="mt-1 space-y-0.5">
            {stuckItems.map((item) => (
              <li key={item.id} className="text-xs text-muted-foreground">
                {item.kind === "order" ? "Order" : "Payment"} queued {timeAgo(item.queuedAt)} —{" "}
                {item.lastError ?? "Unknown error"}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}