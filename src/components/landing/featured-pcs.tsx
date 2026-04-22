"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

import type { Product } from "@/lib/products";
import { formatTzs } from "@/lib/currency";
import { computeCreditPlan } from "@/lib/credit";
import { useDictionary, useLocale } from "@/i18n/provider";

export function FeaturedPcs({ products }: { products: Product[] }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.featured;

  return (
    <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.heading}
          </h2>
        </div>
        <Link
          href={`/${locale}/store`}
          className="hidden text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline"
        >
          {t.shopAll}
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {products.map((product, i) => {
          const plan = computeCreditPlan(product.priceTzs, 12);
          const monthlyLabel = t.monthlyPrefix.replace(
            "{amount}",
            formatTzs(plan.monthly, locale),
          );
          return (
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <Link
                href={`/${locale}/store/${product.slug}`}
                className="group relative block overflow-hidden rounded-3xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-xl hover:shadow-black/10"
              >
                <div
                  className="relative aspect-[4/5] w-full overflow-hidden"
                  style={{
                    background: `radial-gradient(ellipse at top, ${product.colorAccent ?? "#d4d4d8"}22, transparent 70%)`,
                  }}
                >
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 text-[11px] uppercase tracking-[0.15em]">
                    <span className="rounded-full bg-background/70 px-2.5 py-1 text-foreground backdrop-blur-md">
                      {product.brand}
                    </span>
                    <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-background">
                      {t.newBadge}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {product.name}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {product.tagline}
                  </p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-[15px] font-medium">
                      {formatTzs(product.priceTzs, locale)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {monthlyLabel}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
