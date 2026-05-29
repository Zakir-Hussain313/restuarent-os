"use client";

import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategorySidebarProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
  isLoading: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CategorySkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-[#ebe9e4] animate-pulse"
          style={{ opacity: 1 - i * 0.1 }}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelect,
  isLoading,
}: CategorySidebarProps) {
  if (isLoading) return <CategorySkeleton />;

  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {/* All Items */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8570e]",
          selectedCategoryId === null
            ? "bg-[#e8570e] text-white shadow-sm"
            : "text-[#4a4744] hover:bg-[#f9f8f6] hover:text-[#1a1815]"
        )}
      >
        All Items
      </button>

      {/* Category list */}
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={cn(
            "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8570e]",
            selectedCategoryId === category.id
              ? "bg-[#e8570e] text-white shadow-sm"
              : "text-[#4a4744] hover:bg-[#f9f8f6] hover:text-[#1a1815]"
          )}
        >
          <span className="flex items-center gap-2.5">
            {category.icon && (
              <span className="text-base leading-none">{category.icon}</span>
            )}
            <span className="truncate">{category.name}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}