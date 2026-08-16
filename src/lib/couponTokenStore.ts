import { createStore, get, set, del } from "idb-keyval";
import type { ActiveCoupon } from "@/features/coupons/actions";

// Dedicated store, separate from both the TanStack Query cache persister
// (src/app/providers.tsx — narrowly scoped to menu categories/items only)
// and the offline order queue (offlineOrderQueue.ts) — this holds a third,
// distinct kind of local state: a per-branch snapshot cached while still
// online, plus a per-staff token ledger created once per outage. Keeping
// it in its own store means none of the three systems can collide on key
// names or be cleared together by accident.
const couponTokenStore = createStore("zaiqa-coupon-tokens", "tokens");

// ─── Branch snapshot — cached on every successful online CouponPicker load ──
//
// Must be cached BEFORE a disconnect, not computed at disconnect time:
// once offline, the server (and therefore both the coupons' remaining-use
// counts AND the clocked-in staff count from `attendance`) is unreachable.
// Both numbers this ledger needs must already be sitting in IndexedDB by
// the moment the drop happens.

// Full coupon record, not just id/name/remaining — includes discountType,
// discountValue, menuItemIds, categoryIds. Needed so an offline-selected
// coupon prices identically to an online one (e.g. "10% off, burgers only"
// still applies correctly, not just a bare name with no discount logic).
// ActiveCoupon already has all of this plus remainingUses, so reuse it
// instead of hand-picking fields and risking a mismatch with the real type.
export type CachedCouponRemaining = ActiveCoupon;

export interface BranchCouponSnapshot {
  branchId: string;
  coupons: CachedCouponRemaining[];
  clockedInStaffCount: number;
  cachedAt: number;
}

function snapshotKey(branchId: string): string {
  return `snapshot:${branchId}`;
}

export async function cacheBranchCouponSnapshot(
  snapshot: BranchCouponSnapshot
): Promise<void> {
  await set(snapshotKey(snapshot.branchId), snapshot, couponTokenStore);
}

export async function getBranchCouponSnapshot(
  branchId: string
): Promise<BranchCouponSnapshot | undefined> {
  return await get<BranchCouponSnapshot>(snapshotKey(branchId), couponTokenStore);
}

// ─── Per-staff token ledger — created once per outage, on first offline use ──
//
// Computed lazily, the first time a given staff member's CouponPicker hits
// a fetch failure during an outage — not via a proactive browser `offline`
// listener. The browser's offline event is unreliable (doesn't always fire
// on silent connectivity loss, fires on wifi toggles), and this codebase's
// existing offline detection (usePosOrder's try/catch) is already reactive,
// not proactive — this stays consistent with that, and the practical lag
// (at most one order, since staff open the picker per-order) is negligible.
//
// Once created, the ledger is NOT recomputed on subsequent picker opens
// during the same outage — recomputing would re-split an already-shrinking
// remaining count against a possibly-changed staff count and violate the
// "sum of all local ceilings <= true remaining" invariant the design
// depends on. It only gets cleared on reconciliation (see clearStaffLedger).

export interface StaffCouponTokens {
  staffId: string;
  branchId: string;
  tokens: { couponId: string; remaining: number | null }[];
  splitAt: number;
}

function ledgerKey(staffId: string, branchId: string): string {
  return `ledger:${staffId}:${branchId}`;
}

export async function getOrCreateStaffLedger(
  staffId: string,
  snapshot: BranchCouponSnapshot
): Promise<StaffCouponTokens> {
  const key = ledgerKey(staffId, snapshot.branchId);
  const existing = await get<StaffCouponTokens>(key, couponTokenStore);
  if (existing) return existing;

  // Guard against divide-by-zero — if the cached clocked-in count was 0
  // (stale snapshot, or the fetching staff member wasn't yet checked in
  // when it was cached), fall back to treating this staff member as the
  // sole recipient rather than crashing the picker.
  const staffCount = Math.max(snapshot.clockedInStaffCount, 1);

  const ledger: StaffCouponTokens = {
    staffId,
    branchId: snapshot.branchId,
    tokens: snapshot.coupons.map((c) => ({
      couponId: c.id,
      remaining:
        c.remainingUses === null ? null : Math.floor(c.remainingUses / staffCount),
    })),
    splitAt: Date.now(),
  };

  await set(key, ledger, couponTokenStore);
  return ledger;
}

// Decrements the instant an offline order using the coupon is queued —
// called from usePosOrder's catch block, right alongside enqueuePendingOrder.
// Structural: once a coupon's local count hits 0 it simply stops being
// returned as usable, same mechanism as today's "no coupons available".
export async function decrementStaffToken(
  staffId: string,
  branchId: string,
  couponId: string
): Promise<void> {
  const key = ledgerKey(staffId, branchId);
  const ledger = await get<StaffCouponTokens>(key, couponTokenStore);
  if (!ledger) return; // nothing to decrement — shouldn't happen in practice

  const updated: StaffCouponTokens = {
    ...ledger,
    tokens: ledger.tokens.map((t) =>
      t.couponId === couponId && t.remaining !== null
        ? { ...t, remaining: Math.max(0, t.remaining - 1) }
        : t
    ),
  };
  await set(key, updated, couponTokenStore);
}

// Called once a staff member's queued offline orders have all synced
// (reconciliation). Deliberately simple bookkeeping — no conflict
// resolution — since the allocation invariant was guaranteed at split
// time, not checked afterward.
export async function clearStaffLedger(staffId: string, branchId: string): Promise<void> {
  await del(ledgerKey(staffId, branchId), couponTokenStore);
}