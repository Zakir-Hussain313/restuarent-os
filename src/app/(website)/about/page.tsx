import Link from "next/link";
import { TEAM, STATS } from "@/features/website/data/websiteContent";
import { ChefHat, ArrowRight, Leaf, Handshake, Flame } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-[#1a1815] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #e8570e 1px, transparent 1px)", backgroundSize: "30px 30px" }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-3">
              Our Story
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
              Built on Flavour,<br />Rooted in Karachi
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-xl">
              Rice n Spice was born in 2016 from a simple belief — that authentic Pakistani food, cooked with the right spices and the right care, doesn&apos;t need shortcuts. Eight years later, that belief is still the foundation of everything we do.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#e8570e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-orange-600">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1 lg:px-8">
              <span className="text-3xl font-bold text-white">{value}</span>
              <span className="text-sm text-orange-100/80">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-[#faf9f7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Visual */}
          <div className="relative">
            <div className="aspect-4/3 bg-linear-to-br from-[#2d1810] to-[#1a0f08] rounded-2xl flex items-center justify-center overflow-hidden">
              <ChefHat className="w-24 h-24 text-primary" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
                <p className="text-white text-sm font-semibold">Since 2016</p>
                <p className="text-white/60 text-xs">Serving Karachi with love</p>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-[#e8570e] rounded-2xl px-4 py-3 shadow-xl shadow-orange-900/20">
              <p className="text-white text-2xl font-bold">8+</p>
              <p className="text-orange-100 text-xs">Years of excellence</p>
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">Our Heritage</p>
              <h2 className="text-3xl font-bold text-[#1a1815] leading-tight mb-4">
                From a Family Kitchen to Karachi&apos;s Favourite
              </h2>
            </div>
            <div className="flex flex-col gap-4 text-sm text-[#8a8680] leading-relaxed">
              <p>
                Chef Imran Raza started Rice n Spice with recipes passed down through three generations — dishes that were never written down, only tasted, adjusted, and perfected over decades at the family table.
              </p>
              <p>
                What began as a small dine-in spot in Clifton grew into one of Karachi&apos;s most trusted names for authentic desi cuisine. Our Chicken Karahi, Mutton Biryani, and Seekh Kebabs have earned a loyal following that spans generations.
              </p>
              <p>
                We source our spices from the same suppliers our family has used for 30 years. We use no artificial shortcuts, no frozen shortcuts — just fresh ingredients, traditional methods, and a kitchen full of people who genuinely love to cook.
              </p>
            </div>
            <Link
              href="/order"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#e8570e] hover:text-[#c44a0c] transition-colors w-fit"
            >
              Explore our menu
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white border-t border-[#ebe9e4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">The Team</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1815]">The Hands Behind the Food</h2>
            <p className="text-[#8a8680] mt-3 text-sm">
              Every plate is a collaboration between people who take their craft seriously.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TEAM.map(({ name, role, bio, avatar, color }) => (
              <div
                key={name}
                className="bg-[#faf9f7] rounded-2xl border border-[#ebe9e4] p-6 flex flex-col items-center text-center gap-4 hover:shadow-sm hover:border-[#e8570e]/20 transition-all duration-200"
              >
                <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-2xl font-bold`}>
                  {avatar}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1a1815]">{name}</h3>
                  <p className="text-xs text-[#e8570e] font-medium mt-0.5">{role}</p>
                  <p className="text-xs text-[#8a8680] mt-2 leading-relaxed">{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[#faf9f7] border-t border-[#ebe9e4]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">Our Values</p>
          <h2 className="text-3xl font-bold text-[#1a1815] mb-8">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              { icon: Leaf, title: "Freshness First", body: "No shortcuts. Every ingredient is sourced fresh and prepared the same day." },
              { icon: Handshake, title: "Community", body: "We're part of Karachi's fabric. We give back, we hire local, we care about this city." },
              { icon: Flame, title: "Uncompromising Taste", body: "If it doesn't taste like it should, it doesn't leave our kitchen. Every time." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl border border-[#ebe9e4] p-5 flex flex-col gap-3">
                <Icon className="w-6 h-6 text-[#e8570e]" />
                <h3 className="text-sm font-semibold text-[#1a1815]">{title}</h3>
                <p className="text-xs text-[#8a8680] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}