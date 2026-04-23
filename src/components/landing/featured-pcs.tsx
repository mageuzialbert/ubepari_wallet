"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import type { Product } from "@/lib/products";
import type { Locale } from "@/i18n/config";
import { formatTzs } from "@/lib/currency";
import { computeMonthlyTarget } from "@/lib/goal";
import { useDictionary, useLocale } from "@/i18n/provider";

export function FeaturedPcs({ products }: { products: Product[] }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.featured;

  if (products.length === 0) return null;

  const [hero, ...rest] = products;
  const sideCards = rest.slice(0, 2);
  const overflow = rest.slice(2);

  const monthlyLabel = (priceTzs: number) => {
    const monthly = computeMonthlyTarget(priceTzs, 12);
    return t.monthlyPrefix.replace("{amount}", formatTzs(monthly, locale));
  };

  return (
    <section className="mx-auto mt-28 max-w-6xl px-4 sm:mt-32 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            {t.heading}
          </h2>
        </div>
        <Link
          href={`/${locale}/store`}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {t.shopAll}
        </Link>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
        <HeroTile
          product={hero}
          monthlyLabel={monthlyLabel(hero.priceTzs)}
          newBadge={t.newBadge}
          locale={locale}
        />
        {sideCards.map((product, i) => (
          <CompactTile
            key={product.slug}
            product={product}
            monthlyLabel={monthlyLabel(product.priceTzs)}
            newBadge={t.newBadge}
            locale={locale}
            delay={0.1 + i * 0.08}
          />
        ))}
      </div>

      {overflow.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {overflow.map((product, i) => (
            <CompactTile
              key={product.slug}
              product={product}
              monthlyLabel={monthlyLabel(product.priceTzs)}
              newBadge={t.newBadge}
              locale={locale}
              delay={0.2 + i * 0.06}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function HeroTile({
  product,
  monthlyLabel,
  newBadge,
  locale,
}: {
  product: Product;
  monthlyLabel: string;
  newBadge: string;
  locale: Locale;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="md:col-span-2 md:row-span-2"
    >
      <Link
        href={`/${locale}/store/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card transition-all hover:border-border hover:shadow-xl hover:shadow-black/20"
      >
        <div
          className="relative aspect-[16/11] w-full overflow-hidden md:aspect-auto md:flex-1"
          style={{
            background: `radial-gradient(ellipse at top, ${product.colorAccent ?? "#d4d4d8"}22, transparent 70%)`,
          }}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            priority
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 text-[11px] uppercase tracking-[0.18em]">
            <span className="rounded-full bg-background/75 px-3 py-1 text-foreground backdrop-blur-md">
              {product.brand}
            </span>
            <span className="rounded-full bg-foreground/90 px-3 py-1 text-background">
              {newBadge}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {product.name}
            </h3>
            <p className="mt-2 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
              {product.tagline}
            </p>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border/50 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold">
                {formatTzs(product.priceTzs, locale)}
              </span>
              <span className="text-sm text-muted-foreground">
                {monthlyLabel}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/95 px-4 py-2 text-[12px] font-medium text-background transition-transform group-hover:translate-x-0.5">
              View
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function CompactTile({
  product,
  monthlyLabel,
  newBadge,
  locale,
  delay,
}: {
  product: Product;
  monthlyLabel: string;
  newBadge: string;
  locale: Locale;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/${locale}/store/${product.slug}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-border/60 bg-card transition-all hover:border-border hover:shadow-lg hover:shadow-black/10"
      >
        <div
          className="relative aspect-[4/3] w-full overflow-hidden"
          style={{
            background: `radial-gradient(ellipse at top, ${product.colorAccent ?? "#d4d4d8"}22, transparent 70%)`,
          }}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-[10px] uppercase tracking-[0.18em]">
            <span className="rounded-full bg-background/75 px-2.5 py-1 text-foreground backdrop-blur-md">
              {product.brand}
            </span>
            <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-background">
              {newBadge}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="text-base font-semibold tracking-tight">
            {product.name}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {product.tagline}
          </p>
          <div className="mt-auto flex items-baseline justify-between pt-2">
            <span className="text-sm font-medium">
              {formatTzs(product.priceTzs, locale)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {monthlyLabel}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
