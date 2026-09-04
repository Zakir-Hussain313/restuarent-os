import { createStore, get, set, del, keys as idbKeys } from "idb-keyval";
import type { PaymentMethod } from "@/types";

// Dedicated IndexedDB store, separate from both the query-cache persister
// and the offline order queue's own store — keeps offline payment data
// isolated so none of the three can collide on key names or be cleared
// together by accident.
const pendingPaymentsStore = createStore("zaiqa-pending-payments", "payments");

export interface PendingPayment {
  clientPaymentId: string;
  orderId: string;
  // Cash only — card/JazzCash/bank transfer are never queued offline,
  // they require a live connection to verify/process, so the UI disables
  // them while offline instead of ever reaching this queue.
  paymentMethod: PaymentMethod;
  createdAt: number;
  attempts: number;
  lastError?: string;
  // Who completed this bill and at which branch — needed at sync time
  // for the same reasons offline orders track it (audit trail, and to
  // scope any future per-branch reconciliation).
  staffId: string;
  branchId: string;
}

export async function enqueuePendingPayment(payment: PendingPayment): Promise<void> {
  await set(payment.clientPaymentId, payment, pendingPaymentsStore);
}

export async function listPendingPayments(): Promise<PendingPayment[]> {
  const allKeys = await idbKeys(pendingPaymentsStore);
  const paymentsList = await Promise.all(
    allKeys.map((key) => get<PendingPayment>(key, pendingPaymentsStore))
  );
  return paymentsList
    .filter((p): p is PendingPayment => p !== undefined)
    .sort((a, b) => a.createdAt - b.createdAt); // oldest first — preserves completion order
}

export async function removePendingPayment(clientPaymentId: string): Promise<void> {
  await del(clientPaymentId, pendingPaymentsStore);
}

export async function updatePendingPayment(
  clientPaymentId: string,
  patch: Partial<Pick<PendingPayment, "attempts" | "lastError">>
): Promise<void> {
  const existing = await get<PendingPayment>(clientPaymentId, pendingPaymentsStore);
  if (!existing) return;
  await set(clientPaymentId, { ...existing, ...patch }, pendingPaymentsStore);
}