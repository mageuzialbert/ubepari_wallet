import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { PRODUCT_SLUGS } from "@/lib/products";

const PUBLIC_PATHS = [
  "",
  "/store",
  "/recommend",
  "/support",
  "/signin",
  "/signup",
];

export default function sitemap(): MetadataRoute.Sitemap {
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

  for (const slug of PRODUCT_SLUGS) {
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
