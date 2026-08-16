"use client";

import { useEffect, useState } from "react";
import { listPendingOrders } from "@/lib/offlineOrderQueue";

// Polls the offline order queue for a live count of orders waiting to sync.
// No pub/sub with OfflineSyncManager — per the agreed 4d plan, this just
// polls on an interval and re-checks on the 'online' event, same triggers
// OfflineSyncManager itself uses. Interval is shorter (10s) than the sync
// manager's 45s fallback so the badge reflects mid-sync progress (orders
// disappearing one by one) reasonably promptly, not just before/after.
export function usePendingOrdersCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    function poll() {
      listPendingOrders().then((pending) => {
        if (active) setCount(pending.length);
      });
    }

    poll(); // in case orders were queued last session

    window.addEventListener("online", poll);
    const intervalId = setInterval(poll, 10_000);

    return () => {
      active = false;
      window.removeEventListener("online", poll);
      clearInterval(intervalId);
    };
  }, []);

  return count;
}