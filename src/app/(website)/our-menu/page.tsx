"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, Clock, Flame, Leaf } from "lucide-react";
import { MENU_CATEGORIES, MENU_ITEMS } from "@/features/website/data/menuData";
import { formatCurrency } from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  Bestseller:    "bg-[#e8570e] text-white",
  "Chef's Pick": "bg-[#1a1815] text-white",
  New:           "bg-emerald-500 text-white",
  Popular:       "bg-blue-500 text-white",
  Seasonal:      "bg-purple-500 text-white",
};

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? MENU_ITEMS
        : MENU_ITEMS.filter((item) => item.categoryId === activeCategory),
    [activeCategory]
  );

  return (
    <>
      {/* Page header */}
      <section className="pt-28 pb-12 bg-[#1a1815] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #e8570e 1px, transparent 1px)", backgroundSize: "30px 30px" }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-3">
            Our Menu
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Crafted With Tradition
          </h1>
          <p className="text-white/50 max-w-xl mx-auto">
            From hearty karahis to street-side favourites — every dish prepared fresh to order.
          </p>
        </div>
      </section>

      {/* Category tabs — sticky */}
      <div className="sticky top-16 z-30 bg-white border-b border-[#ebe9e4] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            {MENU_CATEGORIES.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
                  activeCategory === id
                    ? "bg-[#e8570e] text-white shadow-sm"
                    : "text-[#8a8680] hover:text-[#1a1815] hover:bg-[#f4f2ef]"
                }`}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <section className="py-12 bg-[#faf9f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs text-[#8a8680] mb-6">
            Showing <span className="font-semibold text-[#1a1815]">{filtered.length}</span> items
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-[#ebe9e4] overflow-hidden hover:shadow-md hover:border-[#e8570e]/20 transition-all duration-200"
              >
                {/* Visual */}
                <div className="relative h-40 bg-linear-to-br from-[#f4f2ef] to-[#ebe9e4] flex items-center justify-center">
                  <span className="text-6xl">{item.emoji}</span>
                  {item.tag && (
                    <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${TAG_STYLES[item.tag] ?? "bg-gray-100 text-gray-600"}`}>
                      {item.tag}
                    </span>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {item.isSpicy && (
                      <span className="bg-red-50 border border-red-100 rounded-full p-1">
                        <Flame className="w-3 h-3 text-red-500" />
                      </span>
                    )}
                    {item.isVeg && (
                      <span className="bg-green-50 border border-green-100 rounded-full p-1">
                        <Leaf className="w-3 h-3 text-green-500" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-[#1a1815]">{item.name}</h3>
                    <span className="text-sm font-bold text-[#e8570e] shrink-0">{formatCurrency(item.price)}</span>
                  </div>
                  <p className="text-xs text-[#8a8680] leading-relaxed line-clamp-2 mb-3">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] text-[#8a8680]">
                      <Clock className="w-3 h-3" />
                      {item.prepTime}
                    </span>
                    <Link
                      href="/order"
                      className="flex items-center gap-1.5 bg-[#e8570e] hover:bg-[#c44a0c] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      Add to Order
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#8a8680]">
              <span className="text-5xl mb-4 block">🍽️</span>
              <p className="text-sm">No items in this category yet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}