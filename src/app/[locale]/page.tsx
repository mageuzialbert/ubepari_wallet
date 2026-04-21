import { LandingHero } from "@/components/landing/hero";
import { FeaturedPcs } from "@/components/landing/featured-pcs";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AiCta } from "@/components/landing/ai-cta";
import { TrustStrip } from "@/components/landing/trust-strip";

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <FeaturedPcs />
      <HowItWorks />
      <AiCta />
      <TrustStrip />
    </>
  );
}
