"use client";

import { usePosStore } from "@/store/usePosStore";
import type { MenuItem } from "@/types";
import { MenuItemCard } from "./MenuItemCard";

interface MenuGridProps {
  items: MenuItem[];
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2 animate-pulse">
      <div className="aspect-square rounded-lg bg-muted" />
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-5 bg-muted rounded w-1/3" />
    </div>
  );
}

export function MenuGrid({ items, isLoading }: MenuGridProps) {
  const cartItems = usePosStore((s) => s.cartItems);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-3">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">🍽️</span>
        <p className="text-sm font-medium text-muted-foreground">No items found</p>
        <p className="text-xs text-muted-foreground mt-1">Try a different category or search</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-3">
      {items.map((item) => {
        const cartItem = cartItems.find((ci) => ci.menuItem.id === item.id);
        return (
          <MenuItemCard
            key={item.id}
            item={item}
            cartQuantity={cartItem?.quantity ?? 0}
          />
        );
      })}
    </div>
  );
}