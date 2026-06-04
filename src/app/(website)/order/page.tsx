"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { mockCategories, mockMenuItems } from "@/mock-data";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import { CategoryTabs } from "@/features/online-ordering/components/CategoryTabs";
import { MenuItemCard } from "@/features/online-ordering/components/MenuItemCard";
import { CustomerCart } from "@/features/online-ordering/components/CustomerCart";
import { formatCurrency } from "@/lib/utils";

export default function OrderPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const router = useRouter();

  const items = useCustomerCartStore((s) => s.items);
  const itemCount = useCustomerCartStore((s) => s.itemCount);
  const subtotal = useCustomerCartStore((s) => s.subtotal);

  const filteredItems = useMemo(() => {
    const available = mockMenuItems.filter((i) => i.status === "available");
    if (activeCategory === "all") return available;
    return available.filter((i) => i.categoryId === activeCategory);
  }, [activeCategory]);

  const activeCategories = useMemo(() => {
    const ids = new Set(
      mockMenuItems
        .filter((i) => i.status === "available")
        .map((i) => i.categoryId)
    );
    return mockCategories.filter((c) => ids.has(c.id) && c.isActive);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-16">
      {/* Header */}
      <div className="bg-[#1a1815] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">
            Order Online
          </p>
          <h1 className="text-3xl font-bold text-white">
            What are you craving?
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Fresh food delivered to your door.
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <CategoryTabs
        categories={activeCategories}
        activeCategory={activeCategory}
        onChange={setActiveCategory}
      />

      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">
          {/* Menu grid */}
          <div className="flex-1 min-w-0">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-[#8a8680]">
                <p className="text-sm">No items available in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const cartItem = items.find(
                    (ci) => ci.menuItem.id === item.id
                  );
                  return (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      cartQuantity={cartItem?.quantity ?? 0}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart — desktop sticky */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-24">
            <CustomerCart onCheckout={() => router.push("/order/checkout")} />
          </div>
        </div>
      </div>

      {/* Mobile checkout bar */}
      {itemCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#ebe9e4] lg:hidden z-40">
          <button
            onClick={() => router.push("/order/checkout")}
            className="w-full flex items-center justify-between bg-[#e8570e] hover:bg-[#c44a0c] text-white font-semibold px-5 py-3.5 rounded-xl transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              View Cart ({itemCount()} items)
            </span>
            <span>{formatCurrency(subtotal())}</span>
          </button>
        </div>
      )}
    </div>
  );
}