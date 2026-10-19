"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { MenuItem, SelectedModifier, SelectedVariant } from "@/types";
import { usePosInit } from "@/features/pos/hooks/usePosInit";
import { usePosMenu } from "@/features/pos/hooks/usePosMenu";
import { CategoryPills } from "@/features/pos/components/MenuPanel/CategoryPills";
import { MenuSearch } from "@/features/pos/components/MenuPanel/MenuSearch";
import { ItemOptionsModal } from "@/features/pos/components/MenuPanel/ItemOptionsModal";

interface EditOrderMenuPickerProps {
  branchId: string;
  // menuItemId -> quantity already in the draft, shown as a badge.
  quantityByMenuItem: Map<string, number>;
  onAdd: (item: MenuItem, variant?: SelectedVariant, modifiers?: SelectedModifier[]) => void;
}

// Compact, tap-to-add menu list for the edit dialog. Reads the same cached
// POS menu bundle as the POS screen — items with variants/modifiers open the
// usual options step, everything else is added with a single tap.
export function EditOrderMenuPicker({ branchId, quantityByMenuItem, onAdd }: EditOrderMenuPickerProps) {
  const { data, isLoading, error } = usePosInit(branchId);
  const menu = usePosMenu(data, isLoading);
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  const [optionsInstance, setOptionsInstance] = useState(0);

  function handlePick(item: MenuItem) {
    if (item.variants.length > 0 || item.modifierGroups.length > 0) {
      setOptionsInstance((n) => n + 1);
      setOptionsItem(item);
      return;
    }
    onAdd(item);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 overflow-x-auto border-b border-border">
        <CategoryPills
          categories={menu.categories}
          selectedCategoryId={menu.selectedCategoryId}
          onSelect={menu.setSelectedCategoryId}
          isLoading={isLoading}
        />
      </div>

      <div className="shrink-0 border-b border-border px-3 py-2">
        <MenuSearch
          value={menu.searchQuery}
          onChange={menu.setSearchQuery}
          resultCount={menu.filteredItems.length}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
        {error && (
          <p className="py-8 text-center text-sm text-destructive">
            Couldn&apos;t load the menu. Check your connection and reopen this window.
          </p>
        )}

        {!error && !isLoading && menu.filteredItems.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No items found</p>
        )}

        {menu.filteredItems.map((item) => {
          const inDraft = quantityByMenuItem.get(item.id) ?? 0;
          const hasOptions = item.variants.length > 0 || item.modifierGroups.length > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePick(item)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-all",
                "hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]",
                inDraft > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatCurrency(item.basePrice)}
                  {hasOptions ? " · options" : ""}
                </span>
              </span>
              <span
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                  inDraft > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {inDraft > 0 ? inDraft : <Plus className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
      </div>

      {optionsItem && (
        <ItemOptionsModal
          key={optionsInstance}
          item={optionsItem}
          open
          confirmLabel="Add to Order"
          onOpenChange={(next) => {
            if (!next) setOptionsItem(null);
          }}
          onConfirm={(_unitPrice, selection) =>
            onAdd(optionsItem, selection.selectedVariant, selection.selectedModifiers)
          }
        />
      )}
    </div>
  );
}