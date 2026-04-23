"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/i18n/provider";
import { HeroScene } from "@/components/landing/hero-scene";
import { HeroProductTilt } from "@/components/landing/hero-product-tilt";

const HERO_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&q=90";

export function LandingHero() {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.hero;

  return (
    <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden">
      <HeroScene className="absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background/85 via-background/40 to-background/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background"
      />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.5} />
            {t.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-5xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl md:text-[64px] md:leading-[1.05]"
          >
            {t.headingLine1}
            <br />
            <span className="bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent">
              {t.headingLine2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-lg text-balance text-lg text-muted-foreground sm:text-xl"
          >
            {t.subheading}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start"
          >
            <Button asChild size="lg" className="rounded-full px-6 text-[14px]">
              <Link href={`/${locale}/store`}>
                {t.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-full px-6 text-[14px]"
            >
              <Link href={`/${locale}/assistant`}>{t.ctaSecondary}</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-10 flex items-center justify-center gap-3 text-left lg:justify-start"
          >
            <div className="rounded-2xl border border-border/60 bg-background/65 px-4 py-2 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t.featuredLabel}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {t.featuredProduct}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/65 px-4 py-2 backdrop-blur-md">
              <p className="text-[10px] text-muted-foreground">
                {t.priceFromLabel}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {t.priceDisplay}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full"
        >
          <HeroProductTilt src={HERO_PRODUCT_IMAGE} alt={t.featuredProduct} />
        </motion.div>
      </div>
    </section>
  );
}
