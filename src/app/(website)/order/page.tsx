"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import { useLocationStore } from "@/store/useLocationStore";
import {
  usePublicBranchInfo,
  usePublicMenu,
} from "@/features/online-ordering/hooks/useOnlineOrdering";
import { CategoryTabs } from "@/features/online-ordering/components/CategoryTabs";
import { MenuItemCard } from "@/features/online-ordering/components/MenuItemCard";
import { CustomerCart } from "@/features/online-ordering/components/CustomerCart";
import { LocationPickerModal } from "@/features/online-ordering/components/LocationPickerModal";
import { formatCurrency } from "@/lib/utils";
import { BranchSwitcher } from "@/features/online-ordering/components/BranchSwitcher";

export default function OrderPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const router = useRouter();

  const items = useCustomerCartStore((s) => s.items);
  const itemCount = useCustomerCartStore((s) => s.itemCount);
  const subtotal = useCustomerCartStore((s) => s.subtotal);

  const location = useLocationStore((s) => s.location);
  const { branchInfo, isLoading: branchInfoLoading } = usePublicBranchInfo();

  // Resolve which branch this session should show a menu for:
  // - single-branch tenants never need the modal, always use that one branch
  // - multi-branch tenants need a location saved in the store first
  const resolvedBranchId =
    branchInfo?.branchCount === 1
      ? branchInfo.singleBranch?.id
      : location?.branchId;

  const needsLocationPicker =
    !branchInfoLoading && branchInfo && branchInfo.branchCount >= 2 && !location;

  const { categories, items: menuItems, isLoading: menuLoading } =
    usePublicMenu(resolvedBranchId);

  const categoryIconMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.icon]));
  }, [categories]);

  const filteredItems = useMemo(() => {
    const available = menuItems.filter((i) => i.status === "available");
    if (activeCategory === "all") return available;
    return available.filter((i) => i.categoryId === activeCategory);
  }, [menuItems, activeCategory]);

  const activeCategories = useMemo(() => {
    const ids = new Set(
      menuItems.filter((i) => i.status === "available").map((i) => i.categoryId)
    );
    return categories.filter((c) => ids.has(c.id) && c.isActive);
  }, [categories, menuItems]);

  if (branchInfoLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pt-16 flex items-center justify-center">
        <p className="text-sm text-[#8a8680]">Loading…</p>
      </div>
    );
  }

  if (branchInfo === undefined) {
    // usePublicBranchInfo errored (e.g. no active branches configured)
    return (
      <div className="min-h-screen bg-[#faf9f7] pt-16 flex items-center justify-center">
        <p className="text-sm text-[#8a8680]">
          Online ordering isn&apos;t available right now.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-16">
      {needsLocationPicker && <LocationPickerModal mode="delivery" />}

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

      <BranchSwitcher mode="delivery" />

      {!needsLocationPicker && resolvedBranchId && (
        <>
          <CategoryTabs
            categories={activeCategories}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex gap-8 items-start">
              <div className="flex-1 min-w-0">
                {menuLoading ? (
                  <div className="text-center py-16 text-[#8a8680]">
                    <p className="text-sm">Loading menu…</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-16 text-[#8a8680]">
                    <p className="text-sm">No items available in this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredItems.map((item) => {
                      const cartItem = items.find((ci) => ci.menuItem.id === item.id);
                      return (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          cartQuantity={cartItem?.quantity ?? 0}
                          categoryIcon={categoryIconMap.get(item.categoryId)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="hidden lg:block w-80 shrink-0 sticky top-24">
                <CustomerCart onCheckout={() => router.push("/order/checkout")} />
              </div>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}