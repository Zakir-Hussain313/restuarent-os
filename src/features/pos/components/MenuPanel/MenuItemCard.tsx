"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/types";
import { Flame, Soup, Wheat, Sandwich, CircleDot, IceCreamBowl, CupSoda, Salad, UtensilsCrossed } from "lucide-react";
import { ItemOptionsModal } from "./ItemOptionsModal";

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  cat_001: Flame,
  cat_002: Soup,
  cat_003: Wheat,
  cat_004: Sandwich,
  cat_005: CircleDot,
  cat_006: IceCreamBowl,
  cat_007: CupSoda,
  cat_008: Salad,
};

interface MenuItemCardProps {
  item: MenuItem;
  cartQuantity: number;
}

export function MenuItemCard({ item, cartQuantity }: MenuItemCardProps) {
  const CategoryIcon = CATEGORY_ICON[item.categoryId] ?? UtensilsCrossed;
  const addItem = usePosStore((s) => s.addItem);
  const isInCart = cartQuantity > 0;
  const isUnavailable = item.status !== "available";
  const hasOptions = item.variants.length > 0 || item.modifierGroups.length > 0;
  const [optionsOpen, setOptionsOpen] = useState(false);

  function handleClick() {
    if (isUnavailable) return;
    if (hasOptions) {
      setOptionsOpen(true);
      return;
    }
    addItem(item);
  }

  return (
    <Fragment>
    <button
      onClick={handleClick}
      disabled={isUnavailable}
      className={cn(
        "relative rounded-xl border bg-card text-left p-3 space-y-2 transition-all",
        "hover:shadow-md hover:border-primary/40 active:scale-[0.98]",
        isInCart && "border-primary/50 bg-primary/5",
        isUnavailable && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Image */}
      <div className="aspect-5/4 min-[760px]:aspect-square rounded-lg bg-muted overflow-hidden relative">
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
            <CategoryIcon className="w-6 h-6" />
          </div>
        )}
        {isUnavailable && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-lg min-[760px]:text-sm font-semibold min-[760px]:font-medium leading-tight line-clamp-2">{item.name}</p>
        <p className="text-sm min-[760px]:text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
      </div>

      {/* Price row */}
      <div className="flex items-center justify-between">
        <span className="text-lg min-[760px]:text-sm font-bold min-[760px]:font-semibold text-primary">
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
    {hasOptions && (
      <ItemOptionsModal
        item={item}
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        onConfirm={(_unitPrice, selection) =>
          addItem(item, selection.selectedVariant, selection.selectedModifiers)
        }
      />
    )}
    </Fragment>
  );
}