import { createStore, get, set, del, keys as idbKeys } from "idb-keyval";
import type { CreateOrderInput } from "@/features/orders/actions";

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
}

export async function enqueuePendingOrder(order: PendingOrder): Promise<void> {
  await set(order.idempotencyKey, order, pendingOrdersStore);
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