import { HeroSection }          from "@/features/website/components/landing/HeroSection";
import { StatsBar }             from "@/features/website/components/landing/StatsBar";
import { FeaturedDishesSection } from "@/features/website/components/landing/FeaturedDishesSection";
import { WhyUsSection }         from "@/features/website/components/landing/WhyUsSection";
import { TestimonialsSection }  from "@/features/website/components/landing/TestimonialsSection";
import { CTASection }           from "@/features/website/components/landing/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <FeaturedDishesSection />
      <WhyUsSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}