import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale } from "@/i18n/config";
import { getProducts, type Brand, type UsageTag } from "@/lib/products";

export const revalidate = 60;

const ALLOWED_USAGES: UsageTag[] = ["Gaming", "Design", "Coding", "Office", "Student", "Creator"];
const ALLOWED_BRANDS: Brand[] = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "MSI", "Acer", "Custom"];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale") ?? "";
  const locale = hasLocale(localeParam) ? localeParam : defaultLocale;

  const usage = url.searchParams.get("usage") as UsageTag | null;
  const brand = url.searchParams.get("brand") as Brand | null;
  const minPrice = Number(url.searchParams.get("minPrice"));
  const maxPrice = Number(url.searchParams.get("maxPrice"));

  const products = await getProducts(locale);
  const filtered = products.filter((p) => {
    if (usage && ALLOWED_USAGES.includes(usage) && !p.usageTags.includes(usage)) return false;
    if (brand && ALLOWED_BRANDS.includes(brand) && p.brand !== brand) return false;
    if (Number.isFinite(minPrice) && minPrice > 0 && p.priceTzs < minPrice) return false;
    if (Number.isFinite(maxPrice) && maxPrice > 0 && p.priceTzs > maxPrice) return false;
    return true;
  });

  return NextResponse.json({ products: filtered });
}
