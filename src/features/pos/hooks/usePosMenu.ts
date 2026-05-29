"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, createMockQueryFn } from "@/hooks/useMockQuery";
import { mockCategories, mockMenuItems } from "@/mock-data";
import type { MenuItem, MenuCategory } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsePosMenuReturn {
  categories: MenuCategory[];
  items: MenuItem[];
  filteredItems: MenuItem[];
  searchQuery: string;
  selectedCategoryId: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (id: string | null) => void;
  clearFilters: () => void;
  isLoading: boolean;
  hasActiveFilter: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_MIN_LENGTH = 1;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePosMenu(): UsePosMenuReturn {
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<MenuCategory[]>({
    queryKey: queryKeys.menu.categories,
    queryFn: createMockQueryFn(mockCategories, 300),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: queryKeys.menu.items,
    queryFn: createMockQueryFn(mockMenuItems, 300),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryRaw(query);
    if (query.length > 0) setSelectedCategoryId(null);
  }, []);

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => item.status === "available");

    if (selectedCategoryId !== null) {
      result = result.filter((item) => item.categoryId === selectedCategoryId);
    }

    if (searchQuery.length >= SEARCH_MIN_LENGTH) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, selectedCategoryId, searchQuery]);

  const clearFilters = useCallback(() => {
    setSearchQueryRaw("");
    setSelectedCategoryId(null);
  }, []);

  return {
    categories,
    items,
    filteredItems,
    searchQuery,
    selectedCategoryId,
    setSearchQuery,
    setSelectedCategoryId,
    clearFilters,
    isLoading: categoriesLoading || itemsLoading,
    hasActiveFilter: searchQuery.length > 0 || selectedCategoryId !== null,
  };
}