"use client";

import { useMemo, useState } from "react";
import { useCoupons } from "@/features/coupons/hooks/useCoupons";
import { useCouponActions } from "@/features/coupons/hooks/useCouponActions";
import { CouponFormModal } from "./CouponFormModal";
import { CouponRow } from "./CouponRow";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import type { Coupon } from "@/db/schema/orders";
import type { CreateCouponInput } from "@/features/coupons/hooks/useCouponActions";

interface CouponsLayoutProps {
  isSuperAdmin: boolean;
  branches: { id: string; name: string }[] | null;
}

export function CouponsLayout({ isSuperAdmin, branches }: CouponsLayoutProps) {
  const [modal, setModal] = useState<{ isOpen: boolean; entity: Coupon | null }>({
    isOpen: false,
    entity: null,
  });
  const [showPast, setShowPast] = useState(false);

  const { coupons, currentBranchId, isLoading, error } = useCoupons();
  const {
    createCoupon, isCreatingCoupon,
    updateCoupon, isUpdatingCoupon,
    deactivateCoupon,
    deleteCoupon,
  } = useCouponActions();

  const branchNameMap = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const isEffectivelyActive = (c: Coupon) => {
    if (!c.isActive) return false;
    if (c.validTo && new Date(c.validTo) < new Date()) return false;
    if (c.maxUses !== null && c.usesCount >= c.maxUses) return false;
    return true;
  };

  const visibleCoupons = useMemo(
    () => coupons.filter((c) => (showPast ? !isEffectivelyActive(c) : isEffectivelyActive(c))),
    [coupons, showPast]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowPast((v) => !v)}>
          {showPast ? "Active Coupons" : "Past Coupons"}
        </Button>
        <Button onClick={() => setModal({ isOpen: true, entity: null })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Coupon
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#8a8680]" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive py-8 text-center">{error}</p>
      ) : visibleCoupons.length === 0 ? (
        <p className="text-sm text-[#8a8680] py-8 text-center">
          {showPast ? "No past coupons." : "No active coupons."}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleCoupons.map((coupon) => (
            <CouponRow
              key={coupon.id}
              coupon={coupon}
              branchNameMap={branchNameMap}
              canManage={
                isSuperAdmin ||
                (coupon.branchIds?.length === 1 && coupon.branchIds[0] === currentBranchId)
              }
              onEdit={() => setModal({ isOpen: true, entity: coupon })}
              onDeactivate={() => deactivateCoupon(coupon.id)}
              onDelete={() => deleteCoupon(coupon.id)}
            />
          ))}
        </div>
      )}

      {modal.isOpen && (
        <CouponFormModal
          key={modal.entity?.id ?? "create"}
          isOpen={modal.isOpen}
          entity={modal.entity}
          isSuperAdmin={isSuperAdmin}
          branches={branches}
          isLoading={modal.entity ? isUpdatingCoupon : isCreatingCoupon}
          onSubmit={(input) => {
            if (modal.entity) {
              updateCoupon(
                { id: modal.entity.id, input },
                { onSuccess: () => setModal({ isOpen: false, entity: null }) }
              );
            } else {
              createCoupon(input as CreateCouponInput, { onSuccess: () => setModal({ isOpen: false, entity: null }) });
            }
          }}
          onClose={() => setModal({ isOpen: false, entity: null })}
        />
      )}
    </div>
  );
}