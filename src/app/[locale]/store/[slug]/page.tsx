import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldCheck, Truck } from "lucide-react";

import { CreditCalculator } from "@/components/product/credit-calculator";
import { ProductCard } from "@/components/product/product-card";
import { Badge } from "@/components/ui/badge";
import { formatTzs } from "@/lib/currency";
import { getProduct, getProducts, PRODUCT_SLUGS } from "@/lib/products";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "../../dictionaries";

type ProductPageParams = Promise<{ locale: string; slug: string }>;

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    PRODUCT_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: ProductPageParams;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const product = getProduct(slug, locale);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: ProductPageParams;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const product = getProduct(slug, locale);
  if (!product) notFound();
  const dict = await getDictionary(locale);
  const t = dict.product;

  const related = getProducts(locale)
    .filter(
      (p) =>
        p.slug !== product.slug &&
        p.usageTags.some((tag) => product.usageTags.includes(tag)),
    )
    .slice(0, 3);

  const cashLine = t.cashPriceLabel.replace("{stock}", String(product.stock));
  const altAlt = t.altView.replace("{name}", product.name);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <Link
        href={`/${locale}/store`}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t.backLink}
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/60"
            style={{
              background: `radial-gradient(ellipse at center, ${product.colorAccent ?? "#d4d4d8"}33, transparent 70%)`,
            }}
          >
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 55vw"
              priority
              className="object-cover"
            />
          </div>
          {product.images[1] && (
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-border/60 bg-muted/40">
              <Image
                src={product.images[1]}
                alt={altAlt}
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {product.brand}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
              {product.tagline}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {product.usageTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-baseline gap-3 border-y border-border/60 py-5">
            <span className="text-3xl font-semibold tracking-tight">
              {formatTzs(product.priceTzs, locale)}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {cashLine}
            </span>
          </div>

          <CreditCalculator price={product.priceTzs} productSlug={product.slug} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Perk
              icon={<Truck className="h-4 w-4" />}
              title={t.perks.pickup.title}
              body={t.perks.pickup.body}
            />
            <Perk
              icon={<ShieldCheck className="h-4 w-4" />}
              title={t.perks.warranty.title}
              body={t.perks.warranty.body}
            />
          </div>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t.specsHeading}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {product.description}
        </p>

        <dl className="mt-8 grid grid-cols-1 overflow-hidden rounded-3xl border border-border/60 sm:grid-cols-2">
          <Spec label={t.specs.processor} value={product.specs.cpu} />
          <Spec label={t.specs.generation} value={product.specs.cpuGeneration} />
          <Spec label={t.specs.memory} value={product.specs.ram} />
          <Spec label={t.specs.storage} value={product.specs.storage} />
          <Spec label={t.specs.graphics} value={product.specs.gpu} />
          <Spec label={t.specs.display} value={product.specs.display} />
          <Spec label={t.specs.os} value={product.specs.os} />
          <Spec label={t.specs.weight} value={product.specs.weight} />
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t.relatedHeading}
            </h2>
            <Link
              href={`/${locale}/store`}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              {t.browseAll}
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-border/60 p-5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-[15px] font-medium">{value}</dd>
    </div>
  );
}

function Perk({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        <p className="text-[12px] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
