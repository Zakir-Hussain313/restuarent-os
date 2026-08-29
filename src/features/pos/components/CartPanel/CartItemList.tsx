"use client";

import { ShoppingCart } from "lucide-react";
import { usePosStore } from "@/store/usePosStore";
import { CartItem } from "./CartItem";

export function CartItemList() {
  const cartItems = usePosStore((s) => s.cartItems);

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <ShoppingCart className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Cart is empty</p>
        <p className="text-xs text-muted-foreground mt-1">Add items from the menu</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {cartItems.map((item) => (
        <CartItem key={item.cartItemId} item={item} />
      ))}
    </div>
  );
}