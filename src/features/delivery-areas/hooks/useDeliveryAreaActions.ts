"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  addDeliveryAreaAction,
  editDeliveryAreaAction,
  deleteDeliveryAreaAction,
  type DeliveryAreaInput,
} from "@/features/delivery-areas/actions";
import { branchDeliveryAreas } from "@/db/schema";

type DeliveryArea = typeof branchDeliveryAreas.$inferSelect;

export type { DeliveryAreaInput };

export function useDeliveryAreaActions(branchId: string) {
  const queryClient = useQueryClient();
  const areasKey = queryKeys.deliveryAreas.list(branchId);

  // ── Add ─────────────────────────────────────────────────────────
  const { mutate: addArea, isPending: isAddingArea } = useMutation({
    mutationFn: async (input: DeliveryAreaInput) => {
      const res = await addDeliveryAreaAction(input);
      if (!res.success) throw new Error(res.error);
      return input;
    },
    onSuccess: () => {
      // No id returned from the action, so refetch rather than
      // guessing a synthetic row.
      queryClient.invalidateQueries({ queryKey: areasKey });
    },
  });

  // ── Edit ────────────────────────────────────────────────────────
  const { mutate: editArea, isPending: isEditingArea } = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DeliveryAreaInput }) => {
      const res = await editDeliveryAreaAction(id, input);
      if (!res.success) throw new Error(res.error);
      return { id, input };
    },
    onSuccess: ({ id, input }) => {
      queryClient.setQueryData<DeliveryArea[]>(
        areasKey,
        (old) => old?.map((a) =>
          a.id === id
            ? { ...a, city: input.city, area: input.area, updatedAt: new Date() }
            : a
        ) ?? []
      );
    },
  });

  // ── Delete ──────────────────────────────────────────────────────
  const { mutate: deleteArea, isPending: isDeletingArea } = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteDeliveryAreaAction(id);
      if (!res.success) throw new Error(res.error);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<DeliveryArea[]>(
        areasKey,
        (old) => old?.filter((a) => a.id !== id) ?? []
      );
    },
  });

  return {
    addArea, isAddingArea,
    editArea, isEditingArea,
    deleteArea, isDeletingArea,
  };
}