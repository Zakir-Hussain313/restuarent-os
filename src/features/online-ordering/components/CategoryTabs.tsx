"use client";

import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types";

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeCategory: string;
  onChange: (id: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className="sticky top-16 z-40 bg-white border-b border-[#ebe9e4] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
          <button
            onClick={() => onChange("all")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all",
              activeCategory === "all"
                ? "bg-[#e8570e] text-white"
                : "text-[#8a8680] hover:text-[#1a1815] hover:bg-[#f4f2ef]"
            )}
          >
            🍽️ All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all",
                activeCategory === cat.id
                  ? "bg-[#e8570e] text-white"
                  : "text-[#8a8680] hover:text-[#1a1815] hover:bg-[#f4f2ef]"
              )}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}