"use client";

import { useCallback, useEffect, useState } from "react";
import { listPendingOrders, type PendingOrder } from "@/lib/offlineOrderQueue";
import { getOfflineRef } from "@/features/orders/lib/printKitchenTicket";

export interface PendingSyncOrder extends PendingOrder {
  offlineRef: string;
}

// Polled the same way useOfflineSyncStatus is — this is a local device
// queue, not something realtime can push updates for.
export function usePendingSyncOrders() {
  const [orders, setOrders] = useState<PendingSyncOrder[]>([]);

  const refresh = useCallback(async () => {
    const pending = await listPendingOrders();
    setOrders(pending.map((o) => ({ ...o, offlineRef: getOfflineRef(o.idempotencyKey) })));
  }, []);

  useEffect(() => {
    let active = true;
    async function poll() {
      const pending = await listPendingOrders();
      if (!active) return;
      setOrders(pending.map((o) => ({ ...o, offlineRef: getOfflineRef(o.idempotencyKey) })));
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

  return { orders, refresh };
}