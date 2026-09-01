"use client";

import { useMemo, useState, useCallback } from "react";
import type { MenuItem, MenuCategory } from "@/types";
import type { PosInitBundle } from "@/features/pos/actions";

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
// Categories/items now come from the seeded POS init bundle (fetched once
// in PosLayout via usePosInit) instead of this hook fetching them itself.

export function usePosMenu(posInit?: PosInitBundle, isLoading = false): UsePosMenuReturn {
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const categories = useMemo(() => posInit?.categories ?? [], [posInit]);
  const items = useMemo(() => posInit?.items ?? [], [posInit]);

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
    isLoading,
    hasActiveFilter: searchQuery.length > 0 || selectedCategoryId !== null,
  };
}