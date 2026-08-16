"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  createCouponAction,
  updateCouponAction,
  deactivateCouponAction,
  deleteCouponAction,
  type CreateCouponInput,
  type UpdateCouponInput,
} from "@/features/coupons/actions";

export type { CreateCouponInput, UpdateCouponInput };

export function useCouponActions() {
  const queryClient = useQueryClient();
  const couponsKey = queryKeys.coupons.list;

  // ── Create ──────────────────────────────────────────────────────
  const { mutate: createCoupon, isPending: isCreatingCoupon } = useMutation({
    mutationFn: async (input: CreateCouponInput) => {
      const res = await createCouponAction(input);
      if (!res.success) throw new Error(res.error);
      return res.coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKey });
    },
  });

  // ── Update ──────────────────────────────────────────────────────
  const { mutate: updateCoupon, isPending: isUpdatingCoupon } = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCouponInput }) => {
      const res = await updateCouponAction(id, input);
      if (!res.success) throw new Error(res.error);
      return { id, input };
    },
    onSuccess: () => {
      // Structural fields aren't editable but display fields are —
      // refetch rather than hand-patch to stay simple and correct.
      queryClient.invalidateQueries({ queryKey: couponsKey });
    },
  });

  // ── Deactivate ──────────────────────────────────────────────────
  const { mutate: deactivateCoupon, isPending: isDeactivatingCoupon } = useMutation({
    mutationFn: async (id: string) => {
      const res = await deactivateCouponAction(id);
      if (!res.success) throw new Error(res.error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKey });
    },
  });

  // ── Delete ──────────────────────────────────────────────────────
  const { mutate: deleteCoupon, isPending: isDeletingCoupon } = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteCouponAction(id);
      if (!res.success) throw new Error(res.error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKey });
    },
  });

  return {
    createCoupon, isCreatingCoupon,
    updateCoupon, isUpdatingCoupon,
    deactivateCoupon, isDeactivatingCoupon,
    deleteCoupon, isDeletingCoupon,
  };
}