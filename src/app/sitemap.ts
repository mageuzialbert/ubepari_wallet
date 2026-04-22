import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { getProductSlugs } from "@/lib/products";

const PUBLIC_PATHS = [
  "",
  "/store",
  "/recommend",
  "/support",
  "/signin",
  "/signup",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ubeparipc.tech";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    entries.push({
      url: `${base}/${locales[0]}${path}`,
      lastModified: now,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    });
  }

  const slugs = await getProductSlugs();
  for (const slug of slugs) {
    entries.push({
      url: `${base}/${locales[0]}/store/${slug}`,
      lastModified: now,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${base}/${l}/store/${slug}`]),
        ),
      },
    });
  }

  return entries;
}
