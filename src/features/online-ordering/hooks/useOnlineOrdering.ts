"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useMockQuery";
import {
  getPublicBranchInfoAction,
  getPublicDeliveryAreasAction,
  getPublicCitiesAction,
  getPublicAreasForCityAction,
  getPublicBranchesByCityAction,
  getPublicMenuAction,
} from "@/features/online-ordering/actions";

// ─── Branch info — tells the page whether to show the location modal ────

export function usePublicBranchInfo() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.branchInfo,
    queryFn: async () => {
      const res = await getPublicBranchInfoAction();
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  return { branchInfo: data, isLoading };
}

// ─── Delivery areas, grouped by city, for the location modal ────────────

export function usePublicDeliveryAreas() {
  const { data: cities = [], isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.deliveryAreas,
    queryFn: async () => {
      const res = await getPublicDeliveryAreasAction();
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  return { cities, isLoading };
}

// ─── Menu for the resolved branch ────────────────────────────────────────

export function usePublicMenu(branchId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.menu(branchId ?? ""),
    queryFn: async () => {
      if (!branchId) throw new Error("No branch selected.");
      const res = await getPublicMenuAction(branchId);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: !!branchId,
  });

  return { categories: data?.categories ?? [], items: data?.items ?? [], isLoading };
}

// ─── Distinct cities for the city-picker step ────────────────────────────

export function usePublicCities() {
  const { data: cities = [], isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.cities,
    queryFn: async () => {
      const res = await getPublicCitiesAction();
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
  });

  return { cities, isLoading };
}

// ─── Delivery areas within a picked city (used on /order) ───────────────

export function usePublicAreasForCity(city: string | null) {
  const { data: areas = [], isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.areasForCity(city ?? ""),
    queryFn: async () => {
      if (!city) throw new Error("No city selected.");
      const res = await getPublicAreasForCityAction(city);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: !!city,
  });

  return { areas, isLoading };
}

// ─── Branches within a picked city (used on /book-a-table and the switcher) ─

export function usePublicBranchesByCity(city: string | null) {
  const { data: branches = [], isLoading } = useQuery({
    queryKey: queryKeys.onlineOrdering.branchesByCity(city ?? ""),
    queryFn: async () => {
      if (!city) throw new Error("No city selected.");
      const res = await getPublicBranchesByCityAction(city);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    enabled: !!city,
  });

  return { branches, isLoading };
}