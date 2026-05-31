import Link from "next/link";
import { ShoppingBag, Phone } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-[#1a1815] relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-[#e8570e] opacity-5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-3">
          Ready to Order?
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
          Your Next Favourite Meal
          <br />is One Click Away
        </h2>
        <p className="text-white/50 text-base mb-10 max-w-xl mx-auto">
          Order online for dine-in, takeaway, or delivery. Hot food at your table or your doorstep — always on time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/order"
            className="flex items-center gap-2.5 bg-[#e8570e] hover:bg-[#c44a0c] text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-900/30 hover:-translate-y-0.5"
          >
            <ShoppingBag className="w-5 h-5" />
            Order Online Now
          </Link>
          <a
            href="tel:+922134567890"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            <Phone className="w-5 h-5" />
            Call to Order
          </a>
        </div>
      </div>
    </section>
  );
}