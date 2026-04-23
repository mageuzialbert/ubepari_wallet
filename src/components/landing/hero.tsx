"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/i18n/provider";
import { HeroScene } from "@/components/landing/hero-scene";
import { HeroProductStack } from "@/components/landing/hero-product-stack";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=80",
  "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900&q=80",
  "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=80",
];

export function LandingHero({ stackImages = [] }: { stackImages?: string[] }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.hero;
  const images = stackImages.length > 0 ? stackImages : FALLBACK_IMAGES;

  return (
    <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden">
      <HeroScene className="absolute inset-0 -z-30" />
      <div className="absolute inset-0 -z-20 opacity-55">
        <HeroProductStack images={images} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_900px_560px_at_50%_45%,rgba(0,0,0,0.72),rgba(0,0,0,0.35)_55%,transparent_85%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-b from-transparent to-background"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center sm:px-6">
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
          className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-[-0.03em] text-foreground sm:text-6xl md:text-[72px] md:leading-[1.02]"
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
          className="mt-6 max-w-xl text-balance text-lg text-muted-foreground sm:text-xl"
        >
          {t.subheading}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="pointer-events-none absolute inset-x-0 bottom-10 z-10 mx-auto hidden max-w-sm flex-row items-center justify-center gap-6 text-center sm:flex"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t.featuredLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {t.featuredProduct}
          </p>
        </div>
        <div className="h-6 w-px bg-border/70" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t.priceFromLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {t.priceDisplay}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
