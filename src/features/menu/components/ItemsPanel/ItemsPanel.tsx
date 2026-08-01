"use client";

import { Plus, UtensilsCrossed } from "lucide-react";
import { ItemCard } from "./ItemCard";
import type { MenuCategory, MenuItem, MenuItemStatus } from "@/types";

interface ItemsPanelProps {
  items: MenuItem[];
  selectedCategory: MenuCategory | null;
  isLoading: boolean;
  isToggling: boolean;
  isTogglingFeatured: boolean;
  canManage: boolean;
  onToggleStatus: (itemId: string, status: MenuItemStatus) => void;
  onToggleFeatured: (itemId: string) => void;
  onAddItem: () => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
}

function SkeletonCard() {
  return (
    <div className="bg-background border rounded-xl p-4 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
        <div className="h-7 w-14 bg-muted rounded-lg" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-12 bg-muted rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-4 w-20 bg-muted rounded-full" />
        <div className="h-4 w-24 bg-muted rounded-full" />
      </div>
      <div className="flex justify-between pt-1 border-t border-border">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-6 w-36 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

export function ItemsPanel({
  items,
  selectedCategory,
  isLoading,
  isToggling,
  isTogglingFeatured,
  canManage,
  onToggleStatus,
  onToggleFeatured,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: ItemsPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-3 border-b flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">
            {selectedCategory ? selectedCategory.name : "All Items"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManage && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No items yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first item to this category
            </p>
            {canManage && (
              <button
                onClick={onAddItem}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[...items]
            .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isToggling={isToggling}
                  isTogglingFeatured={isTogglingFeatured}
                  canManage={canManage}
                  onToggleStatus={onToggleStatus}
                  onToggleFeatured={onToggleFeatured}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}