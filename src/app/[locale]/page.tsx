import { LandingHero } from "@/components/landing/hero";
import { FeaturedPcs } from "@/components/landing/featured-pcs";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFaq } from "@/components/landing/landing-faq";
import { AiCta } from "@/components/landing/ai-cta";
import { TrustStrip } from "@/components/landing/trust-strip";
import { hasLocale } from "@/i18n/config";
import { getFeaturedProducts } from "@/lib/products";

type HomePageParams = Promise<{ locale: string }>;

export default async function HomePage({ params }: { params: HomePageParams }) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const featured = await getFeaturedProducts(locale);

  const stackImages = featured
    .flatMap((p) => p.images)
    .filter(Boolean)
    .slice(0, 22);

  return (
    <>
      <LandingHero stackImages={stackImages} />
      <FeaturedPcs products={featured} />
      <HowItWorks />
      <LandingFaq />
      <AiCta />
      <TrustStrip />
    </>
  );
}
