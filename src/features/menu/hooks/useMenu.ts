"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, createMockQueryFn } from "@/hooks/useMockQuery";
import { mockCategories, mockMenuItems } from "@/mock-data";
import type { MenuCategory, MenuItem, MenuItemStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMenu(): UseMenuReturn {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: queryKeys.menu.categories,
    queryFn: createMockQueryFn(mockCategories, 300),
    staleTime: Infinity,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: queryKeys.menu.items,
    queryFn: createMockQueryFn(mockMenuItems, 300),
    staleTime: Infinity,
  });

  const isLoading = categoriesLoading || itemsLoading;

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
    mutationFn: ({ itemId, status }: { itemId: string; status: MenuItemStatus }): Promise<{ itemId: string; status: MenuItemStatus }> =>
      new Promise((resolve) => setTimeout(() => resolve({ itemId, status }), 300)),
    onSuccess: ({ itemId, status }) => {
      queryClient.setQueryData<MenuItem[]>(
        queryKeys.menu.items,
        (old) => old?.map((i) => i.id === itemId ? { ...i, status, updatedAt: new Date().toISOString() } : i) ?? []
      );
    },
  });

  // ── Toggle category active ─────────────────────────────────────
  const { mutate: mutateCategoryActive, isPending: isTogglingCategory } = useMutation({
    mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }): Promise<{ categoryId: string; isActive: boolean }> =>
      new Promise((resolve) => setTimeout(() => resolve({ categoryId, isActive }), 300)),
    onSuccess: ({ categoryId, isActive }) => {
      queryClient.setQueryData<MenuCategory[]>(
        queryKeys.menu.categories,
        (old) => old?.map((c) => c.id === categoryId ? { ...c, isActive, updatedAt: new Date().toISOString() } : c) ?? []
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
  };
}