import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { FEATURED_DISHES } from "../../data/websiteContent";
import { formatCurrency } from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  Bestseller:    "bg-[#e8570e] text-white",
  "Chef's Pick": "bg-[#1a1815] text-white",
  New:           "bg-emerald-500 text-white",
  Popular:       "bg-blue-500 text-white",
};

export function FeaturedDishesSection() {
  return (
    <section className="py-20 bg-[#faf9f7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">
              Our Specialities
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1815] leading-tight">
              Featured Dishes
            </h2>
            <p className="text-[#8a8680] mt-2 max-w-md">
              Hand-picked favourites, crafted fresh every day.
            </p>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#e8570e] hover:text-[#c44a0c] transition-colors shrink-0"
          >
            View full menu
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURED_DISHES.map((dish) => (
            <div
              key={dish.id}
              className="group bg-white rounded-2xl border border-[#ebe9e4] overflow-hidden hover:shadow-md hover:border-[#e8570e]/20 transition-all duration-200"
            >
              {/* Dish visual — emoji placeholder */}
              <div className="relative h-44 bg-linear-to-br from-[#f4f2ef] to-[#ebe9e4] flex items-center justify-center">
                <span className="text-7xl">{dish.emoji}</span>
                {dish.tag && (
                  <span
                    className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      TAG_STYLES[dish.tag] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {dish.tag}
                  </span>
                )}
                <span className="absolute top-3 right-3 text-[10px] text-[#8a8680] bg-white/80 backdrop-blur-sm border border-[#ebe9e4] rounded-full px-2.5 py-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {dish.prepTime}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-[#1a1815] leading-tight">{dish.name}</h3>
                  <span className="text-sm font-bold text-[#e8570e] shrink-0">
                    {formatCurrency(dish.price)}
                  </span>
                </div>
                <p className="text-xs text-[#8a8680] leading-relaxed line-clamp-2 mb-3">
                  {dish.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8a8680] bg-[#f4f2ef] rounded-full px-2.5 py-1">
                    {dish.category}
                  </span>
                  <Link
                    href="/order"
                    className="text-xs font-semibold text-[#e8570e] hover:text-[#c44a0c] transition-colors"
                  >
                    Order →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}