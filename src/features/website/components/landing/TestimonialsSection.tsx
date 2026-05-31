import { Star } from "lucide-react";
import { TESTIMONIALS } from "../../data/websiteContent";

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-[#faf9f7] border-t border-[#ebe9e4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e8570e] mb-2">
            What People Say
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1815] leading-tight">
            Loved by Karachi
          </h2>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-[#ebe9e4] p-6 flex flex-col gap-4 hover:shadow-sm hover:border-[#e8570e]/20 transition-all duration-200"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#e8570e] text-[#e8570e]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-[#4a4540] leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Customer */}
              <div className="flex items-center gap-3 pt-2 border-t border-[#f4f2ef]">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-[#e8570e] shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1815]">{t.name}</p>
                  <p className="text-xs text-[#8a8680]">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}