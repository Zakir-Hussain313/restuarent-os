"use client";

import { Plus, Minus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import type { MenuItem } from "@/types";

interface MenuItemCardProps {
  item: MenuItem;
  cartQuantity: number;
}

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

export function MenuItemCard({ item, cartQuantity }: MenuItemCardProps) {
  const addItem = useCustomerCartStore((s) => s.addItem);
  const items = useCustomerCartStore((s) => s.items);
  const updateQuantity = useCustomerCartStore((s) => s.updateQuantity);

  const cartItem = items.find((ci) => ci.menuItem.id === item.id);
  const isInCart = cartQuantity > 0;

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
      <div className="h-36 bg-linear-to-br from-[#f4f2ef] to-[#ebe9e4] flex items-center justify-center relative">
        <span className="text-6xl">
          {CATEGORY_EMOJI[item.categoryId] ?? "🍴"}
        </span>
        {item.isPopular && (
          <span className="absolute top-2.5 left-2.5 bg-[#e8570e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Popular
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
            onClick={() => addItem(item)}
            className="w-full flex items-center justify-center gap-1.5 bg-[#e8570e] hover:bg-[#c44a0c] text-white text-xs font-semibold py-2 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}