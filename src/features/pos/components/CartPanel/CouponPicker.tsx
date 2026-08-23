"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getActiveCouponsAction, type ActiveCoupon } from "@/features/coupons/actions";
import { getClockedInStaffCountAction } from "@/features/attendance/actions";
import {
  cacheBranchCouponSnapshot,
  getBranchCouponSnapshot,
  getOrCreateStaffLedger,
} from "@/lib/couponTokenStore";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { X } from "lucide-react";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

interface CouponPickerProps {
  branchId?: string;
}

export function CouponPicker({ branchId }: CouponPickerProps) {
  const { showAlert } = useAlertModal();
  const appliedCoupon = usePosStore((s) => s.appliedCoupon);
  const setCoupon = usePosStore((s) => s.setCoupon);
  const clearCoupon = usePosStore((s) => s.clearCoupon);
  const isCouponEligible = usePosStore((s) => s.isCouponEligible);
  const cartItems = usePosStore((s) => s.cartItems);

  const [coupons, setCoupons] = useState<ActiveCoupon[]>([]);
  // Per-staff local remaining count while offline (couponId -> remaining).
  // Populated from the ledger; irrelevant/unused while online, where
  // coupon.remainingUses (global) is shown directly instead.
  const [ledgerRemaining, setLedgerRemaining] = useState<Record<string, number | null>>({});

  // Only ever offer coupons that actually match something in the cart
  // right now — prevents the old "pick it, see 0%, get rejected at
  // checkout" sequence.
  const pickableCoupons = coupons.filter((c) => isCouponEligible(c));
  const [loading, setLoading] = useState(true);
  const [posAllowDiscounts, setPosAllowDiscounts] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // If the staff member removes the last eligible dish while a coupon is
  // applied, auto-clear it instead of letting them find out only at
  // checkout (the old alert-after-the-fact flow).
  const prevCouponIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (appliedCoupon && !isCouponEligible(appliedCoupon)) {
      clearCoupon();
      // Only alert if this coupon was already applied before this render
      // (i.e. this is a real "it just became ineligible" transition, not
      // an initial mount edge case).
      if (prevCouponIdRef.current === appliedCoupon.id) {
        showAlert(`"${appliedCoupon.name}" was removed — no items in the cart are eligible for it anymore.`);
      }
    }
    prevCouponIdRef.current = appliedCoupon?.id ?? null;
  }, [cartItems, appliedCoupon, isCouponEligible, clearCoupon , showAlert]);

  const currentStaff = useAuthStore((s) => s.currentStaff);
  const staffId = currentStaff?.id;

  // Dropdown is portaled to document.body so it isn't clipped by an
  // ancestor panel's overflow-hidden. These track where to position it.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Tracks whether we're currently serving the offline (ledger-based) list,
  // so re-opening the dropdown can re-read the ledger instead of showing a
  // stale snapshot from the first failed fetch.
  // Tracks whether we're currently serving the offline (ledger-based) list,
  // so re-opening the dropdown can re-read the ledger instead of showing a
  // stale snapshot from the first failed fetch. isOfflineRef stays the
  // source of truth for event handlers (onClick — safe to read there);
  // isOffline is a state mirror used only for render, since reading
  // ref.current during render is not allowed.
  const isOfflineRef = useRef(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);
      if (!clickedTrigger && !clickedDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Re-reads the local ledger and refreshes the visible coupon list.
  // Called on the first offline failure AND every subsequent dropdown
  // open while offline, since decrementStaffToken updates IndexedDB after
  // every order but nothing was re-rendering this list to reflect it.
  const refreshFromLedger = useCallback(async () => {
    if (!branchId || !staffId) {
      setPosAllowDiscounts(false);
      return;
    }
    const snapshot = await getBranchCouponSnapshot(branchId).catch(() => undefined);
    if (!snapshot) {
      setPosAllowDiscounts(false);
      return;
    }
    const ledger = await getOrCreateStaffLedger(staffId, snapshot);
    const usable = snapshot.coupons.filter((c) => {
      const token = ledger.tokens.find((t) => t.couponId === c.id);
      return token && token.remaining !== 0; // null = uncapped, always usable
    });
    setCoupons(usable);
    setLedgerRemaining(
      Object.fromEntries(ledger.tokens.map((t) => [t.couponId, t.remaining]))
    );
    setPosAllowDiscounts(true);
  }, [branchId, staffId]);

  // Detect the offline transition the instant it happens (via the browser's
  // offline event — instant, free, no network call), rather than only ever
  // checking once at mount. Also checks navigator.onLine immediately on
  // mount in case the page loaded while already offline.
  useEffect(() => {
    if (typeof window === "undefined" || !branchId || !staffId) return;

    const handleOffline = () => {
      isOfflineRef.current = true;
      setIsOffline(true);
      refreshFromLedger();
    };

    if (!navigator.onLine) {
      // Defer to a microtask instead of calling setState synchronously in
      // the effect body — same effective timing (still fires before paint),
      // just avoids the direct-setState-in-effect lint warning.
      queueMicrotask(handleOffline);
    }

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, [branchId, staffId, refreshFromLedger]);

  useEffect(() => {
    let cancelled = false;

    getActiveCouponsAction()
      .then(async (result) => {
        if (cancelled) return;
        if (result.data === null) {
          setPosAllowDiscounts(false);
          return;
        }
        setCoupons(result.data);
        setPosAllowDiscounts(result.posAllowDiscounts);

        // Cache for offline use. Staff with no branchId (rare — e.g. some
        // super_admin accounts) never get a snapshot: they fail closed if
        // they ever go offline, same as today's behavior.
        if (branchId) {
         try {
            const staffCount = await getClockedInStaffCountAction(branchId);
            if (staffCount.data === null) {
              // Couldn't read attendance (permission/error) — skip caching
              // this time rather than caching a wrong/zero staff count.
              return;
            }
            await cacheBranchCouponSnapshot({
              branchId,
              coupons: result.data,
              clockedInStaffCount: staffCount.data,
              cachedAt: Date.now(),
            });
          } catch (cacheErr) {
            // Never let a caching failure block the (successful, online)
            // coupon list from rendering.
            console.error("[CouponPicker] Failed to cache offline snapshot:", cacheErr);
          }
        }
      })
      .catch(async () => {
        if (cancelled) return;
        isOfflineRef.current = true;
        setIsOffline(true);
        await refreshFromLedger();
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staffId, branchId, refreshFromLedger]);

  // Discounts are disabled tenant-wide — don't render anything at all,
  // not even a "disabled" message, to keep the cart panel clean for
  // restaurants that don't use this feature.
  if (!loading && !posAllowDiscounts) return null;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Coupon
      </label>

      {appliedCoupon ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{appliedCoupon.name}</p>
            {appliedCoupon.description && (
              <p className="text-xs text-muted-foreground truncate">{appliedCoupon.description}</p>
            )}
          </div>
          <button
            onClick={clearCoupon}
            className="shrink-0 px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={async () => {
              // Actual connectivity check, matching how usePosOrder already
              // detects offline (a real failed request) rather than trusting
              // navigator.onLine, which DevTools' network throttling does
              // not reliably flip. Short timeout keeps this fast on a real
              // dead connection, where failure is near-instant anyway.
              if (!isOpen) {
                try {
                  await withTimeout(getActiveCouponsAction(), 3000);
                  isOfflineRef.current = false;
                  setIsOffline(false);
                } catch {
                  isOfflineRef.current = true;
                  setIsOffline(true);
                }
              }

              // Re-sync against the ledger every time the dropdown opens
              // while offline — order counts can have changed since the
              // last time it was open (e.g. another order was just placed).
              if (!isOpen && isOfflineRef.current) {
                await refreshFromLedger();
              }
              if (!isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setDropdownPos({
                  top: rect.bottom + window.scrollY + 4,
                  left: rect.left + window.scrollX,
                  width: rect.width,
                });
              }
              setIsOpen((v) => !v);
            }}
            disabled={loading || pickableCoupons.length === 0}
            className="w-full flex items-center justify-between px-3 py-3.5 min-[760px]:py-1.5 text-base min-[760px]:text-sm border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
          >
            <span className="text-muted-foreground">
              {loading
                ? "Loading coupons..."
                : pickableCoupons.length === 0
                ? "No coupons available"
                : "Apply a coupon"}
            </span>
          </button>

          {isOpen && pickableCoupons.length > 0 && dropdownPos && createPortal(
            <div
              ref={dropdownRef}
              style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
              className="z-50 rounded-md border bg-background shadow-md overflow-hidden"
            >
              <div className="h-36 min-[760px]:h-30 overflow-y-auto">
              {pickableCoupons.map((coupon) => (
                <button
                  key={coupon.id}
                  onClick={async () => {
                    // Last-second guard against a stale render (e.g. two
                    // quick opens/orders racing) — re-check the ledger
                    // right before actually applying, offline only.
                    if (isOfflineRef.current && branchId && staffId) {
                      const snapshot = await getBranchCouponSnapshot(branchId).catch(() => undefined);
                      if (snapshot) {
                        const ledger = await getOrCreateStaffLedger(staffId, snapshot);
                        const token = ledger.tokens.find((t) => t.couponId === coupon.id);
                        if (!token || token.remaining === 0) {
                          showAlert(`"${coupon.name}" has no remaining uses left for you right now.`);
                          await refreshFromLedger();
                          return;
                        }
                      }
                    }
                    setCoupon(coupon);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 min-[760px]:py-2 text-base min-[760px]:text-sm hover:bg-muted transition-colors border-b last:border-b-0"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{coupon.name}</p>
                    {(() => {
                      const remaining = isOffline
                        ? ledgerRemaining[coupon.id] ?? null
                        : coupon.remainingUses ?? null;
                      return remaining !== null ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {remaining} left
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {coupon.description && (
                    <p className="text-xs text-muted-foreground">{coupon.description}</p>
                  )}
                </button>
              ))}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}