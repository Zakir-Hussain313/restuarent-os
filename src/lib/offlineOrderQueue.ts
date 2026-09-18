import { createStore, get, set, del, keys as idbKeys } from "idb-keyval";
import type { CreateOrderInput } from "@/features/orders/actions";
import type { OrderType } from "@/types/order";
import type { CartItem } from "@/store/usePosStore";

// Shared with offlinePaymentQueue.ts and OfflineSyncManager — after this many
// failed sync attempts, an item stops being auto-retried and needs a human.
export const MAX_SYNC_ATTEMPTS = 5;

// Dedicated IndexedDB store, separate from the query-cache persister
// (which lives in the default idb-keyval store) — keeps offline order
// data isolated from cached menu/reference data so the two systems
// can never collide on key names or be cleared together by accident.
const pendingOrdersStore = createStore("zaiqa-pending-orders", "orders");

export interface PendingOrder {
  idempotencyKey: string;
  input: CreateOrderInput;
  targetBranchId?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  // Who queued this order — needed at sync time to know whose coupon
  // token ledger to reconcile once their orders have all synced.
  // Not optional: every offline order is placed by a logged-in staff
  // member, this should always be populated at enqueue time.
  staffId: string;
  branchId: string;
  // Whether the original placement attempt was meant to auto-confirm +
  // auto-print (per the admin setting). The sync manager must replay this
  // step after a successful resubmit, or synced orders silently land as
  // "pending" instead of "confirmed" even when the setting says otherwise.
  autoConfirmOnPlace?: boolean;

  // Local-only lifecycle, tracked entirely on this terminal until the order
  // actually syncs and gets a real ID — this is what lets a customer be
  // paid and walked out the door while still fully offline. "completed"
  // here means "this terminal recorded a cash payment for it locally,"
  // mirroring what completeBillAction does for a real order online.
  localStatus: "pending" | "completed";
  localPayment?: {
    amount: number;
    recordedAt: number;
  };

  // Display-only snapshot of what was in the cart — separate from `input`,
  // which only carries IDs (server looks up names/prices fresh). Captured
  // at enqueue time so the Orders page can show something readable without
  // a menu lookup, AND so a bill can be reprinted later (at completion
  // time) with full variant/modifier detail — same shape the initial
  // offline print already uses, just kept around instead of thrown away.
  displaySnapshot: {
    orderType: OrderType;
    tableNumber?: string;
    notes?: string;
    cartItems: CartItem[];
    totals: {
      subtotal: number;
      discountAmount: number;
      deliveryFee: number;
      total: number;
    };
  };
}

export async function enqueuePendingOrder(order: PendingOrder): Promise<void> {
  await set(order.idempotencyKey, order, pendingOrdersStore);
}

// Records a cash payment against an offline order entirely on this device —
// there's no real order ID yet to record it against on the server. The real
// payment gets created for real once this order syncs (see the sync-side
// work still to come).
export async function completePendingOrderLocally(
  idempotencyKey: string,
  amount: number
): Promise<void> {
  const existing = await get<PendingOrder>(idempotencyKey, pendingOrdersStore);
  if (!existing) return;
  await set(
    idempotencyKey,
    {
      ...existing,
      localStatus: "completed",
      localPayment: { amount, recordedAt: Date.now() },
    },
    pendingOrdersStore
  );
}

export async function listPendingOrders(): Promise<PendingOrder[]> {
  const allKeys = await idbKeys(pendingOrdersStore);
  const orders = await Promise.all(
    allKeys.map((key) => get<PendingOrder>(key, pendingOrdersStore))
  );
  return orders
    .filter((o): o is PendingOrder => o !== undefined)
    .sort((a, b) => a.createdAt - b.createdAt); // oldest first — preserves order sequence
}

export async function removePendingOrder(idempotencyKey: string): Promise<void> {
  await del(idempotencyKey, pendingOrdersStore);
}

export async function updatePendingOrder(
  idempotencyKey: string,
  patch: Partial<Pick<PendingOrder, "attempts" | "lastError">>
): Promise<void> {
  const existing = await get<PendingOrder>(idempotencyKey, pendingOrdersStore);
  if (!existing) return;
  await set(idempotencyKey, { ...existing, ...patch }, pendingOrdersStore);
}