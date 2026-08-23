"use client";

import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types";

interface CategoryPillsProps {
    categories: MenuCategory[];
    selectedCategoryId: string | null;
    onSelect: (id: string | null) => void;
    isLoading: boolean;
}

function PillSkeleton() {
    return (
        <div className="flex gap-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-secondary animate-pulse" />
            ))}
        </div>
    );
}

export function CategoryPills({ categories, selectedCategoryId, onSelect, isLoading }: CategoryPillsProps) {
    if (isLoading) return <PillSkeleton />;

    return (
        <nav className="flex gap-2 p-2 overflow-x-auto">
            <button
                type="button"
                onClick={() => onSelect(null)}
                className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selectedCategoryId === null
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-foreground/80 hover:text-foreground"
                )}
            >
                All Items
            </button>

            {categories.map((category) => (
                <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelect(category.id)}
                    className={cn(
                        "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selectedCategoryId === category.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-foreground/80 hover:text-foreground"
                    )}
                >
                    <span className="flex items-center gap-1.5">
                        {category.icon && <span className="text-sm leading-none">{category.icon}</span>}
                        {category.name}
                    </span>
                </button>
            ))}
        </nav>
    );
}