"use client";

import { useEffect, useState } from "react";
import { listPendingOrders, MAX_SYNC_ATTEMPTS } from "@/lib/offlineOrderQueue";
import { listPendingPayments } from "@/lib/offlinePaymentQueue";

export interface StuckSyncItem {
  id: string;
  kind: "order" | "payment";
  attempts: number;
  lastError?: string;
  queuedAt: number;
}

export interface OfflineSyncStatus {
  pendingCount: number; // total items still waiting to sync (orders + payments)
  stuckCount: number; // subset that hit the retry cap and stopped auto-retrying
  stuckItems: StuckSyncItem[];
}

// Shared read of both offline queues. Polled on the same triggers
// OfflineSyncManager itself uses (10s interval + 'online' event) — no
// pub/sub between them, polling is close enough for a status badge.
export function useOfflineSyncStatus(): OfflineSyncStatus {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    pendingCount: 0,
    stuckCount: 0,
    stuckItems: [],
  });

  useEffect(() => {
    let active = true;

    async function poll() {
      const [orders, payments] = await Promise.all([listPendingOrders(), listPendingPayments()]);
      if (!active) return;

      const stuckItems: StuckSyncItem[] = [
        ...orders
          .filter((o) => o.attempts >= MAX_SYNC_ATTEMPTS)
          .map((o) => ({
            id: o.idempotencyKey,
            kind: "order" as const,
            attempts: o.attempts,
            lastError: o.lastError,
            queuedAt: o.createdAt,
          })),
        ...payments
          .filter((p) => p.attempts >= MAX_SYNC_ATTEMPTS)
          .map((p) => ({
            id: p.clientPaymentId,
            kind: "payment" as const,
            attempts: p.attempts,
            lastError: p.lastError,
            queuedAt: p.createdAt,
          })),
      ];

      setStatus({
        pendingCount: orders.length + payments.length,
        stuckCount: stuckItems.length,
        stuckItems,
      });
    }

    poll();
    window.addEventListener("online", poll);
    const intervalId = setInterval(poll, 10_000);

    return () => {
      active = false;
      window.removeEventListener("online", poll);
      clearInterval(intervalId);
    };
  }, []);

  return status;
}