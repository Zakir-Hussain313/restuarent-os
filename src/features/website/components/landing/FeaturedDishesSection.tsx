import Link from "next/link";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import { getPublicWebsiteMenuAction } from "@/features/online-ordering/actions";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

const FEATURED_COUNT = 6;

export async function FeaturedDishesSection() {
  const { data } = await getPublicWebsiteMenuAction();

  // No active branch / menu configured yet — hide the section rather than
  // showing an empty or fake grid.
  if (!data || data.items.length === 0) {
    return null;
  }

  const categoryNameById = new Map(data.categories.map((c) => [c.id, c.name]));

  const featuredItems = data.items
    .filter((item) => item.isFeatured)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // No curated picks for this branch yet — fall back to the old behaviour
  // (first N by sortOrder) rather than hiding the section.
  const dishes = featuredItems.length > 0
    ? featuredItems.slice(0, FEATURED_COUNT)
    : [...data.items].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, FEATURED_COUNT);

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
            href="/order"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#e8570e] hover:text-[#c44a0c] transition-colors shrink-0"
          >
            View full menu
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {dishes.map((dish) => (
            <div
              key={dish.id}
              className="group bg-white rounded-2xl border border-[#ebe9e4] overflow-hidden hover:shadow-md hover:border-[#e8570e]/20 transition-all duration-200"
            >
              {/* Dish visual — real photo if the item has one, plain fallback otherwise */}
              <div className="relative h-44 bg-linear-to-br from-[#f4f2ef] to-[#ebe9e4] flex items-center justify-center overflow-hidden">
                {dish.image ? (
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <UtensilsCrossed className="w-10 h-10 text-[#c9c5bd]" />
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-[#1a1815] leading-tight">{dish.name}</h3>
                  <span className="text-sm font-bold text-[#e8570e] shrink-0">
                    {formatCurrency(dish.basePrice)}
                  </span>
                </div>
                <p className="text-xs text-[#8a8680] leading-relaxed line-clamp-2 mb-3">
                  {dish.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8a8680] bg-[#f4f2ef] rounded-full px-2.5 py-1">
                    {categoryNameById.get(dish.categoryId) ?? ""}
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