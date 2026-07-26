"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  type CategoryFormInput,
  type ItemFormInput,
} from "@/features/menu/actions";
import type { MenuCategory, MenuItem } from "@/types";

export type { CategoryFormInput, ItemFormInput };

export function useMenuActions(overrideBranchId?: string) {
  const queryClient = useQueryClient();
  const categoriesKey = [...queryKeys.menu.categories, overrideBranchId];
  const itemsKey = [...queryKeys.menu.items, overrideBranchId];

  // ── Add Category ───────────────────────────────────────────────
  const { mutate: addCategory, isPending: isAddingCategory } = useMutation({
    mutationFn: async (input: CategoryFormInput) => {
      const res = await createCategoryAction(input, overrideBranchId);
      if (!res.success) throw new Error(res.error);
      return res.category;
    },
    onSuccess: (newCategory) => {
      queryClient.setQueryData<MenuCategory[]>(
        categoriesKey,
        (old) => [...(old ?? []), newCategory]
      );
    },
  });

  // ── Edit Category ──────────────────────────────────────────────
  const { mutate: editCategory, isPending: isEditingCategory } = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CategoryFormInput }) => {
      const res = await updateCategoryAction(id, input);
      if (!res.success) throw new Error(res.error);
      return { id, input };
    },
    onSuccess: ({ id, input }) => {
      queryClient.setQueryData<MenuCategory[]>(
        categoriesKey,
        (old) => old?.map((c) =>
          c.id === id
            ? { ...c, ...input, updatedAt: new Date().toISOString() }
            : c
        ) ?? []
      );
    },
  });

  // ── Delete Category ────────────────────────────────────────────
  const { mutate: deleteCategory, isPending: isDeletingCategory } = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await deleteCategoryAction(categoryId);
      if (!res.success) throw new Error(res.error);
      return categoryId;
    },
    onSuccess: (categoryId) => {
      queryClient.setQueryData<MenuCategory[]>(
        categoriesKey,
        (old) => old?.filter((c) => c.id !== categoryId) ?? []
      );
      queryClient.setQueryData<MenuItem[]>(
        itemsKey,
        (old) => old?.filter((i) => i.categoryId !== categoryId) ?? []
      );
    },
  });

  // ── Add Item ───────────────────────────────────────────────────
  const { mutate: addItem, isPending: isAddingItem } = useMutation({
    mutationFn: async (input: ItemFormInput) => {
      const res = await createMenuItemAction(input, overrideBranchId);
      if (!res.success) throw new Error(res.error);
      return res.item;
    },
    onSuccess: (newItem) => {
      queryClient.setQueryData<MenuItem[]>(
        itemsKey,
        (old) => [...(old ?? []), newItem]
      );
    },
  });

  // ── Edit Item ──────────────────────────────────────────────────
  const { mutate: editItem, isPending: isEditingItem } = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ItemFormInput }) => {
      const res = await updateMenuItemAction(id, input);
      if (!res.success) throw new Error(res.error);
      return { id, input };
    },
    onSuccess: ({ id, input }) => {
      queryClient.setQueryData<MenuItem[]>(
        itemsKey,
        (old) => old?.map((i) =>
          i.id === id
            ? {
                ...i,
                ...input,
                updatedAt: new Date().toISOString(),
                variants: input.variants.map((v) => ({ ...v, id: v.id ?? "" })),
                modifierGroups: input.modifierGroups.map((g) => ({
                  ...g,
                  id: g.id ?? "",
                  options: g.options.map((o) => ({ ...o, id: o.id ?? "" })),
                })),
              }
            : i
        ) ?? []
      );
      // Nested variant/modifier IDs are server-generated on every edit
      // (wipe-and-rebuild strategy) — force a refetch so the client has
      // the real IDs rather than the empty-string placeholders above.
      queryClient.invalidateQueries({ queryKey: itemsKey });
    },
  });

  // ── Delete Item ────────────────────────────────────────────────
  const { mutate: deleteItem, isPending: isDeletingItem } = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await deleteMenuItemAction(itemId);
      if (!res.success) throw new Error(res.error);
      return itemId;
    },
    onSuccess: (itemId) => {
      queryClient.setQueryData<MenuItem[]>(
        itemsKey,
        (old) => old?.filter((i) => i.id !== itemId) ?? []
      );
    },
  });

  return {
    addCategory, isAddingCategory,
    editCategory, isEditingCategory,
    deleteCategory, isDeletingCategory,
    addItem, isAddingItem,
    editItem, isEditingItem,
    deleteItem, isDeletingItem,
  };
}