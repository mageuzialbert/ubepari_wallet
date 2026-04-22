import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { hasLocale } from "@/i18n/config";
import { listAdminProducts, ADMIN_BRANDS } from "@/lib/admin/products";
import { formatTzs } from "@/lib/currency";
import { getDictionary } from "../../dictionaries";

type PageParams = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string; brand?: string; status?: string }>;

const TABS = ["active", "inactive", "all"] as const;
type TabKey = (typeof TABS)[number];

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

export default async function AdminProductsListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) return null;

  const sp = await searchParams;
  const status: TabKey = (TABS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as TabKey)
    : "active";
  const brand = sp.brand && (ADMIN_BRANDS as readonly string[]).includes(sp.brand) ? sp.brand : "";
  const q = (sp.q ?? "").trim();

  const dict = await getDictionary(locale);
  const t = dict.admin.products;
  const products = await listAdminProducts({ search: q, brand, status });

  function tabHref(tab: TabKey) {
    const qs = new URLSearchParams();
    qs.set("status", tab);
    if (q) qs.set("q", q);
    if (brand) qs.set("brand", brand);
    return `/${locale}/admin/products?${qs.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t.heading}
          </h1>
          <p className="mt-3 max-w-xl text-[14px] text-muted-foreground">{t.body}</p>
        </div>
        <Link
          href={`/${locale}/admin/products/new`}
          className="inline-flex items-center gap-2 self-start rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          {t.list.new}
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab === status;
          return (
            <Link
              key={tab}
              href={tabHref(tab)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "border border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.tabs[tab]}
            </Link>
          );
        })}
      </nav>

      <form
        method="GET"
        action={`/${locale}/admin/products`}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder={t.list.searchPlaceholder}
          className="flex-1 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
        />
        <select
          name="brand"
          defaultValue={brand}
          className="rounded-full border border-border/60 bg-background/40 px-4 py-2 text-[13px] outline-none"
        >
          <option value="">{t.list.allBrands}</option>
          {ADMIN_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button type="submit" className="sr-only">
          {t.list.searchPlaceholder}
        </button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-10 text-center text-[14px] text-muted-foreground">
          {t.list.empty}
        </div>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-3xl border border-border/60">
          {products.map((row) => {
            const name = locale === "sw" ? row.name_sw : row.name_en;
            return (
              <li key={row.id}>
                <Link
                  href={`/${locale}/admin/products/${row.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-background/40">
                    {row.primary_image_url ? (
                      <Image
                        src={row.primary_image_url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-medium">{name}</p>
                      {row.featured ? (
                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {t.list.featuredBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {row.brand} · {row.slug}
                    </p>
                  </div>
                  <div className="hidden min-w-[120px] text-right sm:block">
                    <p className="text-[13px] font-medium">
                      {formatTzs(row.cash_price_tzs, locale)}
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] ${
                        row.stock === 0 ? "text-rose-400" : "text-muted-foreground"
                      }`}
                    >
                      {row.stock === 0 ? t.list.stockOut : `${row.stock} · ${t.list.columns.stock}`}
                    </p>
                  </div>
                  <span
                    className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] sm:inline-flex ${
                      row.active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {row.active ? t.list.status.active : t.list.status.inactive}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
