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
          className="h-10 rounded-lg bg-secondary animate-pulse"
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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          selectedCategoryId === null
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground/80 hover:bg-secondary hover:text-foreground"
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
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            selectedCategoryId === category.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-foreground/80 hover:bg-secondary hover:text-foreground"
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