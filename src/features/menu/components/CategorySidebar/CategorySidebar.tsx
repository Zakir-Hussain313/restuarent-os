"use client";

import { Plus } from "lucide-react";
import { CategoryRow } from "./CategoryRow";
import type { MenuCategory, MenuItem } from "@/types";

interface CategorySidebarProps {
  categories: MenuCategory[];
  items: MenuItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  isLoading: boolean;
  isTogglingCategory: boolean;
  onToggleActive: (categoryId: string, isActive: boolean) => void;
  onAddCategory: () => void;
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (category: MenuCategory) => void;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-2.5 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}

export function CategorySidebar({
  categories,
  items,
  selectedCategoryId,
  onSelectCategory,
  isLoading,
  isTogglingCategory,
  onToggleActive,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: CategorySidebarProps) {
  const getItemCount = (categoryId: string) =>
    items.filter((i) => i.categoryId === categoryId).length;

  return (
    <div className="flex flex-col h-full border-r overflow-hidden w-68 shrink-0">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Categories</h2>
        <button
          onClick={onAddCategory}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* ── All Items row ─────────────────────────────────────────── */}
      <div
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-border ${
          selectedCategoryId === null
            ? "bg-primary/5 border-l-2 border-l-primary"
            : "hover:bg-muted/50 border-l-2 border-l-transparent"
        }`}
      >
        <div className="shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg">
          🍽️
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">All Items</p>
          <p className="text-xs text-muted-foreground">{items.length} items</p>
        </div>
      </div>

      {/* ── Category list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 w-full">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          categories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                itemCount={getItemCount(category.id)}
                isSelected={selectedCategoryId === category.id}
                isTogglingCategory={isTogglingCategory}
                onClick={() => onSelectCategory(category.id)}
                onEdit={onEditCategory}
                onDelete={onDeleteCategory}
                onToggleActive={onToggleActive}
              />
            ))
        )}
      </div>
    </div>
  );
}