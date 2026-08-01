import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { WHY_US } from "../../data/websiteContent";

export function WhyUsSection() {
  return (
    <section className="py-20 bg-white border-t border-[#ebe9e4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">
            Why {RESTAURANT_CONFIG.name}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1815] leading-tight">
            The Difference You Can Taste
          </h2>
          <p className="text-[#8a8680] mt-3">
            We don&apos;t just serve food. We serve an experience rooted in quality, tradition, and care.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WHY_US.map(({ emoji, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-[#faf9f7] border border-[#ebe9e4] hover:border-[#e8570e]/30 hover:shadow-sm transition-all duration-200"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl">
                {emoji}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1a1815] mb-1.5">{title}</h3>
                <p className="text-xs text-[#8a8680] leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}