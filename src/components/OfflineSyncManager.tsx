"use client";

import { useEffect, useRef } from "react";
import {
  listPendingOrders,
  removePendingOrder,
  updatePendingOrder,
} from "@/lib/offlineOrderQueue";
import { createOrderAction, confirmOrderAction } from "@/features/orders/actions";
import { clearStaffLedger } from "@/lib/couponTokenStore";

// Runs once at app root. Listens for the browser regaining connectivity and
// walks the offline order queue, resubmitting each pending order in turn.
// Sequential by design (not parallel) — matches original placement order,
// and avoids hammering the server the instant connectivity returns.
export function OfflineSyncManager() {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function syncPendingOrders() {
      if (isSyncingRef.current) return; // already running, don't overlap
      if (!navigator.onLine) return;

      isSyncingRef.current = true;
      try {
        const pending = await listPendingOrders();

        for (const order of pending) {
          try {
            const result = await createOrderAction(
              order.input,
              order.targetBranchId,
              order.idempotencyKey,
              new Date(order.createdAt),
              true // wasOfflineOrder — this order was placed while the POS was offline
            );

            if (result.success) {
              // Replay auto-confirm status only — the physical ticket
              // already printed at the moment this order was queued
              // offline, so we don't print it again here.
              if (order.autoConfirmOnPlace) {
                const confirmResult = await confirmOrderAction(result.order.id);
                if (!confirmResult.success) {
                  console.error(
                    `[OfflineSyncManager] Order ${result.order.id} synced but auto-confirm failed:`,
                    confirmResult.error
                  );
                }
              }
              await removePendingOrder(order.idempotencyKey);

              // Reconcile this staff member's coupon ledger once ALL of
              // their queued orders have synced — not the whole branch's.
              // Check against the live queue (not the `pending` array we
              // started this pass with) since removePendingOrder above
              // just mutated it.
              if (order.staffId && order.branchId) {
                const stillPending = await listPendingOrders();
                const staffStillHasPending = stillPending.some(
                  (o) => o.staffId === order.staffId && o.branchId === order.branchId
                );
                if (!staffStillHasPending) {
                  await clearStaffLedger(order.staffId, order.branchId).catch((err) => {
                    // Never let ledger cleanup fail a successful sync —
                    // worst case a stale ledger lingers until next outage,
                    // which getOrCreateStaffLedger's overwrite-on-recreate
                    // would still eventually resolve on next real use.
                    console.error("[OfflineSyncManager] Failed to clear staff ledger:", err);
                  });
                }
              }
            } else {
              // Server explicitly rejected it — not a connectivity problem.
              // Record the error and move on; it needs manual attention.
              await updatePendingOrder(order.idempotencyKey, {
                attempts: order.attempts + 1,
                lastError: result.error,
              });
            }
          } catch (err) {
            // Thrown error — assume connectivity dropped again mid-sync.
            // Stop this pass; remaining orders retry on the next trigger.
            await updatePendingOrder(order.idempotencyKey, {
              attempts: order.attempts + 1,
              lastError: err instanceof Error ? err.message : String(err),
            });
            break;
          }
        }
      } finally {
        isSyncingRef.current = false;
      }
    }

    // Attempt once on mount, in case orders were queued last session and
    // we're already online by the time this loads.
    syncPendingOrders();

    window.addEventListener("online", syncPendingOrders);

    // Fallback safety net for browsers that don't reliably fire 'online'.
    const intervalId = setInterval(syncPendingOrders, 45_000);

    return () => {
      window.removeEventListener("online", syncPendingOrders);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}