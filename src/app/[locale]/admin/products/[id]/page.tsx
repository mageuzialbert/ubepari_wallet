import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getAdminProduct } from "@/lib/admin/products";
import { getDictionary } from "../../../dictionaries";
import { ProductForm, type ProductFormInitial } from "../_components/product-form";
import { ImageManager } from "../_components/image-manager";

type PageParams = Promise<{ locale: string; id: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.admin.products.metaTitle,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return null;

  const product = await getAdminProduct(id);
  if (!product) notFound();

  const dict = await getDictionary(locale);
  const t = dict.admin.products;

  const initial: ProductFormInitial = {
    id: product.id,
    slug: product.slug,
    brand: product.brand,
    name_en: product.name_en,
    name_sw: product.name_sw,
    tagline_en: product.tagline_en,
    tagline_sw: product.tagline_sw,
    description_en: product.description_en,
    description_sw: product.description_sw,
    cash_price_tzs: product.cash_price_tzs,
    stock: product.stock,
    featured: product.featured,
    active: product.active,
    color_accent: product.color_accent ?? "",
    specs: product.specs,
    usage_tags: product.usage_tags,
    slug_locked: product.referenced_by_order,
  };

  const displayName = locale === "sw" ? product.name_sw : product.name_en;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/${locale}/admin/products`}
          className="text-[12px] text-muted-foreground hover:text-foreground"
        >
          {t.actions.backToList}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {displayName}
        </h1>
        <p className="mt-1 font-mono text-[12px] text-muted-foreground">{product.slug}</p>
      </div>

      <ImageManager
        productId={product.id}
        initialImages={product.images.map((img) => ({
          id: img.id,
          url: img.url,
          altEn: img.alt_en,
          altSw: img.alt_sw,
        }))}
      />

      <ProductForm mode="edit" initial={initial} />
    </div>
  );
}
