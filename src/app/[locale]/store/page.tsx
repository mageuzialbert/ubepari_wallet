import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductCard } from "@/components/product/product-card";
import { FilterRail } from "@/components/product/filter-rail";
import { getProducts, type Brand, type UsageTag } from "@/lib/products";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../dictionaries";

type StorePageParams = Promise<{ locale: string }>;
type StoreSearchParams = Promise<{
  usage?: string;
  brand?: string;
  price?: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: StorePageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.store.metaTitle,
    description: dict.store.metaDescription,
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: StorePageParams;
  searchParams: StoreSearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.store;

  const { usage, brand, price } = await searchParams;

  let filtered = await getProducts(locale);
  if (usage) {
    filtered = filtered.filter((p) =>
      p.usageTags.includes(usage as UsageTag),
    );
  }
  if (brand) {
    filtered = filtered.filter((p) => p.brand === (brand as Brand));
  }
  if (price) {
    const [minStr, maxStr] = price.split("-");
    const min = Number(minStr);
    const max = Number(maxStr);
    filtered = filtered.filter(
      (p) => p.priceTzs >= min && p.priceTzs <= max,
    );
  }

  const results = (filtered.length === 1 ? t.resultsSingular : t.resultsPlural)
    .replace("{count}", String(filtered.length));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.heading}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
            {results}
          </p>
        </div>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
        <Suspense fallback={<div className="h-60" />}>
          <FilterRail />
        </Suspense>

        {filtered.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-border/60 text-center">
            <div>
              <p className="text-lg font-semibold">{t.emptyTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.emptyBody}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
