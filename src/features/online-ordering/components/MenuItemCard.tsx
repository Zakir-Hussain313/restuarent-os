"use client";

import { useState } from "react";
import { Plus, Minus, UtensilsCrossed } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import type { MenuItem } from "@/types";
import Image from "next/image";
import { ItemOptionsModal } from "./ItemOptionsModal";

interface MenuItemCardProps {
  item: MenuItem;
  cartQuantity: number;
  categoryIcon?: string;
}

export function MenuItemCard({ item, cartQuantity, categoryIcon }: MenuItemCardProps) {
  const addItem = useCustomerCartStore((s) => s.addItem);
  const items = useCustomerCartStore((s) => s.items);
  const updateQuantity = useCustomerCartStore((s) => s.updateQuantity);

  const cartItem = items.find((ci) => ci.menuItem.id === item.id);
  const isInCart = cartQuantity > 0;
  const hasOptions = item.variants.length > 0 || item.modifierGroups.length > 0;
  const [optionsOpen, setOptionsOpen] = useState(false);

  function handleAddClick() {
    if (hasOptions) {
      setOptionsOpen(true);
      return;
    }
    addItem(item);
  }

  const displayPrice =
    item.variants.length > 0
      ? `${formatCurrency(Math.min(...item.variants.map((v) => v.price)))}+`
      : formatCurrency(item.basePrice);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-[#ebe9e4] overflow-hidden transition-all duration-200 hover:shadow-md hover:border-[#e8570e]/20",
        isInCart && "border-[#e8570e]/40"
      )}
    >
      {/* Visual */}
      <div className="h-36 bg-linear-to-br from-[#f4f2ef] to-[#ebe9e4] flex items-center justify-center relative overflow-hidden">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="text-6xl">{categoryIcon ??
            <UtensilsCrossed className="w-12 h-12 text-muted-foreground" />}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-[#1a1815] leading-tight">
            {item.name}
          </h3>
          <span className="text-sm font-bold text-[#e8570e] shrink-0">
            {displayPrice}
          </span>
        </div>
        <p className="text-xs text-[#8a8680] leading-relaxed line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Cart controls */}
        {isInCart && cartItem ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateQuantity(cartItem.cartItemId, cartItem.quantity - 1)
                }
                className="w-7 h-7 rounded-full border border-[#ebe9e4] flex items-center justify-center hover:border-[#e8570e] hover:text-[#e8570e] transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-sm font-semibold w-4 text-center">
                {cartItem.quantity}
              </span>
              <button
                onClick={() =>
                  updateQuantity(cartItem.cartItemId, cartItem.quantity + 1)
                }
                className="w-7 h-7 rounded-full bg-[#e8570e] text-white flex items-center justify-center hover:bg-[#c44a0c] transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs font-medium text-[#e8570e]">
              {formatCurrency(cartItem.itemTotal)}
            </span>
          </div>
        ) : (
          <button
            onClick={handleAddClick}
            className="w-full flex items-center justify-center gap-1.5 bg-[#e8570e] hover:bg-[#c44a0c] text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Cart
          </button>
        )}
      </div>
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
    </div>
  );
}