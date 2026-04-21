import { Suspense } from "react";

import { ProductCard } from "@/components/product/product-card";
import { FilterRail } from "@/components/product/filter-rail";
import { PRODUCTS, type Brand, type UsageTag } from "@/lib/products";

export const metadata = {
  title: "Store — Every PC we stock",
  description:
    "Browse Ubepari's full lineup of gaming PCs, ultrabooks, and custom towers. Filter by use case, brand, and monthly payment.",
};

type StoreSearchParams = Promise<{
  usage?: string;
  brand?: string;
  price?: string;
}>;

export default async function StorePage({
  searchParams,
}: {
  searchParams: StoreSearchParams;
}) {
  const { usage, brand, price } = await searchParams;

  let filtered = PRODUCTS;
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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Store
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Every PC we stock.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "model" : "models"}{" "}
            available right now. Every machine ships same-day from our Dar
            showroom.
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
              <p className="text-lg font-semibold">No PCs match those filters</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing a filter or two.
              </p>
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
