"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
import {
  getMenuCategoriesAction,
  getMenuItemsAction,
  toggleItemStatusAction,
  toggleCategoryActiveAction,
  toggleItemFeaturedAction,
} from "@/features/menu/actions";
import type { MenuCategory, MenuItem, MenuItemStatus } from "@/types";

export interface UseMenuReturn {
  categories: MenuCategory[];
  items: MenuItem[];
  itemsByCategory: (categoryId: string) => MenuItem[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  isLoading: boolean;
  toggleItemStatus: (itemId: string, status: MenuItemStatus) => void;
  isToggling: boolean;
  toggleCategoryActive: (categoryId: string, isActive: boolean) => void;
  isTogglingCategory: boolean;
  toggleItemFeatured: (itemId: string) => void;
  isTogglingFeatured: boolean;
}

export function useMenu(overrideBranchId?: string): UseMenuReturn {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const categoriesKey = useMemo(
    () => [...queryKeys.menu.categories, overrideBranchId],
    [overrideBranchId]
  );
  const itemsKey = useMemo(
    () => [...queryKeys.menu.items, overrideBranchId],
    [overrideBranchId]
  );

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: categoriesKey,
    queryFn: async () => {
      const res = await getMenuCategoriesAction(overrideBranchId);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: itemsKey,
    queryFn: async () => {
      const res = await getMenuItemsAction(overrideBranchId);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  const isLoading = categoriesLoading || itemsLoading;

  const onRealtimeEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: itemsKey });
  }, [queryClient, itemsKey]);

  useBranchChannel(overrideBranchId, "menu", onRealtimeEvent);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, []);
      map.get(item.categoryId)!.push(item);
    }
    return map;
  }, [items]);

  const getItemsByCategory = (categoryId: string) =>
    itemsByCategory.get(categoryId) ?? [];

  // ── Toggle item status ─────────────────────────────────────────
  const { mutate: mutateItemStatus, isPending: isToggling } = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: MenuItemStatus }) => {
      const res = await toggleItemStatusAction(itemId, status);
      if (!res.success) throw new Error(res.error);
      return { itemId, status };
    },
    onSuccess: ({ itemId, status }) => {
      queryClient.setQueryData<MenuItem[]>(
        itemsKey,
        (old) => old?.map((i) => i.id === itemId ? { ...i, status, updatedAt: new Date().toISOString() } : i) ?? []
      );
    },
  });

  // ── Toggle category active ─────────────────────────────────────
  const { mutate: mutateCategoryActive, isPending: isTogglingCategory } = useMutation({
    mutationFn: async ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      const res = await toggleCategoryActiveAction(categoryId, isActive);
      if (!res.success) throw new Error(res.error);
      return { categoryId, isActive };
    },
    onSuccess: ({ categoryId, isActive }) => {
      queryClient.setQueryData<MenuCategory[]>(
        categoriesKey,
        (old) => old?.map((c) => c.id === categoryId ? { ...c, isActive, updatedAt: new Date().toISOString() } : c) ?? []
      );
    },
  });

  // ── Toggle item featured ───────────────────────────────────────
  const { mutate: mutateItemFeatured, isPending: isTogglingFeatured } = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await toggleItemFeaturedAction(itemId);
      if (!res.success) throw new Error(res.error);
      return { itemId, isFeatured: res.isFeatured };
    },
    onSuccess: ({ itemId, isFeatured }) => {
      queryClient.setQueryData<MenuItem[]>(
        itemsKey,
        (old) => old?.map((i) => i.id === itemId ? { ...i, isFeatured, updatedAt: new Date().toISOString() } : i) ?? []
      );
    },
  });

  return {
    categories,
    items,
    itemsByCategory: getItemsByCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isLoading,
    toggleItemStatus: (itemId, status) => mutateItemStatus({ itemId, status }),
    isToggling,
    toggleCategoryActive: (categoryId, isActive) => mutateCategoryActive({ categoryId, isActive }),
    isTogglingCategory,
    toggleItemFeatured: (itemId) => mutateItemFeatured(itemId),
    isTogglingFeatured,
  };
}