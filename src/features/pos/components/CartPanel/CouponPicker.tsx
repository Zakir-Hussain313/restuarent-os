"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import { useAuthStore } from "@/store/useAuthStore";
import { getActiveCouponsAction, type ActiveCoupon } from "@/features/coupons/actions";
import {
  cacheBranchCouponSnapshot,
  getBranchCouponSnapshot,
  getOrCreateStaffLedger,
} from "@/lib/couponTokenStore";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { X } from "lucide-react";
import type { PosInitBundle } from "@/features/pos/actions";

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
  posInit?: PosInitBundle;
}

export function CouponPicker({ branchId, posInit }: CouponPickerProps) {
  const { showAlert } = useAlertModal();
  const appliedCoupon = usePosStore((s) => s.appliedCoupon);
  const setCoupon = usePosStore((s) => s.setCoupon);
  const clearCoupon = usePosStore((s) => s.clearCoupon);
  const isCouponEligible = usePosStore((s) => s.isCouponEligible);
  const cartItems = usePosStore((s) => s.cartItems);

  const [coupons, setCoupons] = useState<ActiveCoupon[]>(posInit?.coupons ?? []);
  const [ledgerRemaining, setLedgerRemaining] = useState<Record<string, number | null>>({});

  const pickableCoupons = coupons.filter((c) => isCouponEligible(c));
  const [loading, setLoading] = useState(!posInit);
  const [posAllowDiscounts, setPosAllowDiscounts] = useState(posInit?.posAllowDiscounts ?? true);
  const [isOpen, setIsOpen] = useState(false);

  const prevCouponIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (appliedCoupon && !isCouponEligible(appliedCoupon)) {
      clearCoupon();
      if (prevCouponIdRef.current === appliedCoupon.id) {
        showAlert(`"${appliedCoupon.name}" was removed — no items in the cart are eligible for it anymore.`);
      }
    }
    prevCouponIdRef.current = appliedCoupon?.id ?? null;
  }, [cartItems, appliedCoupon, isCouponEligible, clearCoupon, showAlert]);

  const currentStaff = useAuthStore((s) => s.currentStaff);
  const staffId = currentStaff?.id;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

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
      return token && token.remaining !== 0;
    });
    setCoupons(usable);
    setLedgerRemaining(
      Object.fromEntries(ledger.tokens.map((t) => [t.couponId, t.remaining]))
    );
    setPosAllowDiscounts(true);
  }, [branchId, staffId]);

  useEffect(() => {
    if (typeof window === "undefined" || !branchId || !staffId) return;

    const handleOffline = () => {
      isOfflineRef.current = true;
      setIsOffline(true);
      refreshFromLedger();
    };

    if (!navigator.onLine) {
      queueMicrotask(handleOffline);
    }

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, [branchId, staffId, refreshFromLedger]);

  // Seed local state from the POS init bundle when it changes (first load,
  // or a branch switch). This is a render-time state adjustment, not an
  // effect — avoids the "setState synchronously in effect" cascading-render
  // warning, per React's "adjusting state when a prop changes" pattern.
  const [seededFrom, setSeededFrom] = useState<PosInitBundle | undefined>(undefined);
  if (posInit && posInit !== seededFrom) {
    setSeededFrom(posInit);
    setCoupons(posInit.coupons);
    setPosAllowDiscounts(posInit.posAllowDiscounts);
    setLoading(false);
  }

  // Caching to IndexedDB is a genuine external-system side effect, so it
  // stays in a real effect (runs after the render-time seed above commits).
  useEffect(() => {
    if (!posInit || !branchId) return;
    cacheBranchCouponSnapshot({
      branchId,
      coupons: posInit.coupons,
      clockedInStaffCount: posInit.clockedInCount,
      cachedAt: Date.now(),
    }).catch((cacheErr) => {
      console.error("[CouponPicker] Failed to cache offline snapshot:", cacheErr);
    });
  }, [posInit, branchId]);

  if (!loading && !posAllowDiscounts) return null;

  return (
    <CollapsibleSection
      label="Coupon"
      summary={appliedCoupon ? appliedCoupon.name : "None applied"}
      defaultOpen={Boolean(appliedCoupon)}
    >
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
              if (!isOpen) {
                try {
                  const result = await withTimeout(getActiveCouponsAction(), 3000);
                  isOfflineRef.current = false;
                  setIsOffline(false);
                  if (result.data !== null) {
                    setCoupons(result.data);
                    setPosAllowDiscounts(result.posAllowDiscounts);
                  }
                } catch {
                  isOfflineRef.current = true;
                  setIsOffline(true);
                }
              }

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
    </CollapsibleSection>
  );
}