import { apiJson } from "./client";
import type { Product } from "@/types/api";

export type ProductFilters = {
  usage?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  locale?: string;
};

export async function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.usage) params.set("usage", filters.usage);
  if (filters.brand) params.set("brand", filters.brand);
  if (typeof filters.minPrice === "number") params.set("minPrice", String(filters.minPrice));
  if (typeof filters.maxPrice === "number") params.set("maxPrice", String(filters.maxPrice));
  if (filters.locale) params.set("locale", filters.locale);
  const qs = params.toString();
  const res = await apiJson<{ products: Product[] }>(
    `/api/products${qs ? `?${qs}` : ""}`,
  );
  return res.products;
}

export async function getProduct(slug: string, locale?: string): Promise<Product | null> {
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await apiJson<{ product: Product | null }>(
    `/api/products/${encodeURIComponent(slug)}${qs}`,
  );
  return res.product;
}
