"use client";

import { useMemo, useState } from "react";
import type { MenuItem, SelectedVariant, SelectedModifier } from "@/types";

interface UseItemOptionsReturn {
  selectedVariantId: string | null;
  setSelectedVariantId: (id: string) => void;
  selectedOptionIds: Record<string, string[]>; // groupId -> optionIds
  toggleOption: (groupId: string, optionId: string, maxSelections: number) => void;
  unitPrice: number;
  canConfirm: boolean;
  missingRequiredGroupIds: string[];
  buildSelection: () => { selectedVariant?: SelectedVariant; selectedModifiers: SelectedModifier[] };
}

/**
 * Shared variant/modifier selection state for the "choose options" step
 * before an item is added to any cart (POS or customer online ordering).
 * Both carts store price impact as a priceAdjustment relative to
 * item.basePrice, so a chosen variant's absolute `price` is converted to
 * an adjustment here (variant.price - item.basePrice) once, in one place.
 */
export function useItemOptions(item: MenuItem): UseItemOptionsReturn {
  const availableVariants = useMemo(
    () => item.variants.filter((v) => v.isAvailable),
    [item.variants]
  );

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => availableVariants.find((v) => v.isDefault)?.id ?? availableVariants[0]?.id ?? null
  );

  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    item.modifierGroups.forEach((group) => {
      initial[group.id] = group.options.filter((o) => o.isAvailable && o.isDefault).map((o) => o.id);
    });
    return initial;
  });

  function toggleOption(groupId: string, optionId: string, maxSelections: number) {
    setSelectedOptionIds((prev) => {
      const current = prev[groupId] ?? [];
      const isSelected = current.includes(optionId);

      if (isSelected) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }

      if (maxSelections === 1) {
        // Single-select group behaves like a radio — replace, don't add.
        return { ...prev, [groupId]: [optionId] };
      }

      if (current.length >= maxSelections) {
        // Already at the cap — ignore rather than silently overflow.
        return prev;
      }

      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  const missingRequiredGroupIds = useMemo(() => {
    return item.modifierGroups
      .filter((group) => group.isRequired)
      .filter((group) => (selectedOptionIds[group.id]?.length ?? 0) < Math.max(1, group.minSelections))
      .map((group) => group.id);
  }, [item.modifierGroups, selectedOptionIds]);

  const canConfirm = missingRequiredGroupIds.length === 0;

  const unitPrice = useMemo(() => {
    const selectedVariant = availableVariants.find((v) => v.id === selectedVariantId);
    const base = selectedVariant ? selectedVariant.price : item.basePrice;

    const modifierTotal = item.modifierGroups.reduce((sum, group) => {
      const selectedIds = selectedOptionIds[group.id] ?? [];
      return (
        sum +
        group.options
          .filter((o) => selectedIds.includes(o.id))
          .reduce((s, o) => s + o.priceAdjustment, 0)
      );
    }, 0);

    return base + modifierTotal;
  }, [availableVariants, selectedVariantId, item.basePrice, item.modifierGroups, selectedOptionIds]);

  function buildSelection() {
    const variant = availableVariants.find((v) => v.id === selectedVariantId);
    const selectedVariant: SelectedVariant | undefined = variant
      ? {
          variantId: variant.id,
          variantName: variant.name,
          priceAdjustment: variant.price - item.basePrice,
        }
      : undefined;

    const selectedModifiers: SelectedModifier[] = item.modifierGroups.flatMap((group) => {
      const selectedIds = selectedOptionIds[group.id] ?? [];
      return group.options
        .filter((o) => selectedIds.includes(o.id))
        .map((o) => ({
          groupId: group.id,
          groupName: group.name,
          optionId: o.id,
          optionName: o.name,
          priceAdjustment: o.priceAdjustment,
        }));
    });

    return { selectedVariant, selectedModifiers };
  }

  return {
    selectedVariantId,
    setSelectedVariantId,
    selectedOptionIds,
    toggleOption,
    unitPrice,
    canConfirm,
    missingRequiredGroupIds,
    buildSelection,
  };
}