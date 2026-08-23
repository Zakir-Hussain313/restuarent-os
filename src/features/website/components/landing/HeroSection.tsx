import Link from "next/link";
import { ShoppingBag, ChevronDown, Star, Clock, Leaf, Phone, Bike } from "lucide-react";

const TRUST_PILLS = [
  { icon: Clock, label: "30 min delivery" },
  { icon: Leaf, label: "Fresh daily" },
  { icon: Phone, label: "Order by phone" },
  { icon: Bike, label: "Free delivery over Rs. 2000" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background — warm gradient simulating food photography */}
      <div className="absolute inset-0 bg-linear-to-br from-[#1a0f08] via-[#2d1810] to-[#1a1208]" />

      {/* Texture overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #e8570e22 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, #f4a26122 0%, transparent 40%),
                            radial-gradient(circle at 60% 80%, #e8570e11 0%, transparent 40%)`,
        }}
      />

      {/* Decorative circles */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-[#e8570e] opacity-5 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-orange-400 opacity-5 blur-2xl" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-[#e8570e] text-[#e8570e]" />
            ))}
          </div>
          <span className="text-white/80 text-xs font-medium">Karachi&apos;s Most Loved Restaurant</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
          Authentic Flavours,{" "}
          <span className="text-[#e8570e] relative">
            Crafted
            <svg
              className="absolute -bottom-2 left-0 w-full"
              viewBox="0 0 200 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 6 Q50 2 100 5 Q150 8 200 4"
                stroke="#e8570e"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
            </svg>
          </span>{" "}
          With Love
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
          From sizzling karahis to fragrant biryanis — every plate carries the soul of Pakistan.
          Dine in, takeaway, or get it delivered to your door.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/order"
            className="flex items-center gap-2.5 bg-[#e8570e] hover:bg-[#c44a0c] text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-900/40 hover:shadow-orange-900/60 hover:-translate-y-0.5"
          >
            <ShoppingBag className="w-5 h-5" />
            Order Online
          </Link>
          <Link
            href="/order"
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            View Full Menu
          </Link>
        </div>

        {/* Trust pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {TRUST_PILLS.map(
            (item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/10 rounded-full px-3 py-1.5"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </span>
            )
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
        <span className="text-white/30 text-xs">Scroll</span>
        <ChevronDown className="w-4 h-4 text-white/30" />
      </div>
    </section>
  );
}