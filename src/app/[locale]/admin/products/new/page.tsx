import type { Metadata } from "next";
import Link from "next/link";

import { hasLocale } from "@/i18n/config";
import { getDictionary } from "../../../dictionaries";
import { DEFAULT_PRODUCT_FORM, ProductForm } from "../_components/product-form";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.admin.products.list.new} · ${dict.admin.products.metaTitle}`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function AdminProductNewPage({
  params,
}: {
  params: PageParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;
  const dict = await getDictionary(locale);
  const t = dict.admin.products;

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
          {t.list.new}
        </h1>
      </div>
      <ProductForm mode="create" initial={DEFAULT_PRODUCT_FORM} />
    </div>
  );
}
