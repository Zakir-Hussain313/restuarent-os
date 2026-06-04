"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import { formatCurrency } from "@/lib/utils";

interface CustomerCartProps {
  onCheckout: () => void;
}

export function CustomerCart({ onCheckout }: CustomerCartProps) {
  const items = useCustomerCartStore((s) => s.items);
  const removeItem = useCustomerCartStore((s) => s.removeItem);
  const subtotal = useCustomerCartStore((s) => s.subtotal);
  const itemCount = useCustomerCartStore((s) => s.itemCount);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#ebe9e4] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#f4f2ef] flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-5 h-5 text-[#8a8680]" />
        </div>
        <p className="text-sm font-medium text-[#1a1815]">Your cart is empty</p>
        <p className="text-xs text-[#8a8680] mt-1">
          Add items from the menu to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#ebe9e4] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#ebe9e4]">
        <h2 className="text-sm font-semibold text-[#1a1815]">
          Your Order ({itemCount()} items)
        </h2>
      </div>

      {/* Items */}
      <div className="divide-y divide-[#f4f2ef] max-h-80 overflow-y-auto">
        {items.map((ci) => (
          <div key={ci.cartItemId} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1a1815] leading-tight">
                {ci.menuItem.name}
              </p>
              {ci.selectedVariant && (
                <p className="text-xs text-[#8a8680] mt-0.5">
                  {ci.selectedVariant.variantName}
                </p>
              )}
              <p className="text-xs text-[#8a8680] mt-0.5">
                {ci.quantity} × {formatCurrency(ci.unitPrice)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-[#1a1815]">
                {formatCurrency(ci.itemTotal)}
              </span>
              <button
                onClick={() => removeItem(ci.cartItemId)}
                className="text-[#8a8680] hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 py-3.5 border-t border-[#ebe9e4] space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#8a8680]">Subtotal</span>
          <span className="font-medium text-[#1a1815]">
            {formatCurrency(subtotal())}
          </span>
        </div>
        <div className="flex justify-between text-xs text-[#8a8680]">
          <span>Delivery fee</span>
          <span>Rs. 150</span>
        </div>
        <div className="flex justify-between text-sm font-bold border-t border-[#f4f2ef] pt-3">
          <span className="text-[#1a1815]">Total</span>
          <span className="text-[#e8570e]">
            {formatCurrency(subtotal() + 150)}
          </span>
        </div>
        <button
          onClick={onCheckout}
          className="w-full bg-[#e8570e] hover:bg-[#c44a0c] text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}