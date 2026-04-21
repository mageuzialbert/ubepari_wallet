import Link from "next/link";
import Image from "next/image";

import type { Product } from "@/lib/products";
import { formatTzs } from "@/lib/currency";
import { computeCreditPlan } from "@/lib/credit";

export function ProductCard({ product }: { product: Product }) {
  const plan = computeCreditPlan(product.priceTzs, 12);
  return (
    <Link
      href={`/store/${product.slug}`}
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
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-[11px] uppercase tracking-[0.15em]">
          <span className="rounded-full bg-background/70 px-2 py-1 text-foreground backdrop-blur-md">
            {product.brand}
          </span>
          {product.stock <= 3 && (
            <span className="rounded-full bg-foreground/90 px-2 py-1 text-background">
              Low stock
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-[15px] font-semibold tracking-tight">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">
          {product.tagline}
        </p>
        <div className="mt-4 flex items-baseline justify-between gap-2">
          <span className="text-[14px] font-medium">
            {formatTzs(product.priceTzs)}
          </span>
          <span className="text-[12px] text-muted-foreground">
            {formatTzs(plan.monthly)}/mo
          </span>
        </div>
      </div>
    </Link>
  );
}
