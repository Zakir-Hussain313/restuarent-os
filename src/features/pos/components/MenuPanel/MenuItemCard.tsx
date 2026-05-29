"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/types";

// Fallback emojis per category id — matches your mock data
const CATEGORY_EMOJI: Record<string, string> = {
  cat_001: "🔥",
  cat_002: "🍲",
  cat_003: "🍚",
  cat_004: "🍔",
  cat_005: "🫓",
  cat_006: "🍮",
  cat_007: "🥤",
  cat_008: "🥗",
};

interface MenuItemCardProps {
  item: MenuItem;
  cartQuantity: number;
}

export function MenuItemCard({ item, cartQuantity }: MenuItemCardProps) {
  const addItem = usePosStore((s) => s.addItem);
  const isInCart = cartQuantity > 0;
  const isUnavailable = item.status !== "available";

  return (
    <button
      onClick={() => !isUnavailable && addItem(item)}
      disabled={isUnavailable}
      className={cn(
        "relative rounded-xl border bg-card text-left p-3 space-y-2 transition-all",
        "hover:shadow-md hover:border-primary/40 active:scale-[0.98]",
        isInCart && "border-primary/50 bg-primary/5",
        isUnavailable && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Image */}
      <div className="aspect-square rounded-lg bg-muted overflow-hidden relative">
        {item.image && !item.image.startsWith("/images/") ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-muted">
            {CATEGORY_EMOJI[item.categoryId] ?? "🍴"}
          </div>
        )}

        {/* Badges */}
        {item.isPopular && (
          <span className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-tight">
            Popular
          </span>
        )}
        {isUnavailable && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-sm font-medium leading-tight line-clamp-2">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">
          {formatCurrency(item.basePrice)}
        </span>
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
            isInCart
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isInCart ? cartQuantity : <Plus className="w-3 h-3" />}
        </div>
      </div>
    </button>
  );
}