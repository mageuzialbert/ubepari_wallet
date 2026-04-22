import "server-only";

import type { Locale } from "@/i18n/config";
import { supabaseAnon } from "@/lib/supabase/anon";

export type UsageTag = "Gaming" | "Design" | "Coding" | "Office" | "Student" | "Creator";
export type Brand = "Apple" | "Dell" | "HP" | "Lenovo" | "ASUS" | "MSI" | "Acer" | "Custom";

export type ProductSpecs = {
  cpu: string;
  cpuGeneration: string;
  ram: string;
  storage: string;
  gpu: string;
  display: string;
  os: string;
  weight: string;
};

export type Product = {
  slug: string;
  name: string;
  brand: Brand;
  tagline: string;
  description: string;
  priceTzs: number;
  images: string[];
  specs: ProductSpecs;
  usageTags: UsageTag[];
  stock: number;
  featured?: boolean;
  colorAccent?: string;
};

type ProductSelect = {
  id: string;
  slug: string;
  brand: string;
  name_en: string;
  name_sw: string;
  tagline_en: string;
  tagline_sw: string;
  description_en: string;
  description_sw: string;
  cash_price_tzs: number;
  specs: Record<string, unknown>;
  usage_tags: string[];
  stock: number;
  featured: boolean;
  color_accent: string | null;
};

type ImageSelect = {
  product_id: string;
  path: string;
  position: number;
};

const PRODUCT_COLUMNS =
  "id, slug, brand, name_en, name_sw, tagline_en, tagline_sw, description_en, description_sw, cash_price_tzs, specs, usage_tags, stock, featured, color_accent";

function publicImageUrl(path: string): string {
  return supabaseAnon().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

function toProduct(
  row: ProductSelect,
  images: ImageSelect[],
  locale: Locale,
): Product {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return {
    slug: row.slug,
    name: locale === "sw" ? row.name_sw : row.name_en,
    brand: row.brand as Brand,
    tagline: locale === "sw" ? row.tagline_sw : row.tagline_en,
    description: locale === "sw" ? row.description_sw : row.description_en,
    priceTzs: row.cash_price_tzs,
    images: sorted.map((i) => publicImageUrl(i.path)),
    specs: row.specs as unknown as ProductSpecs,
    usageTags: row.usage_tags as UsageTag[],
    stock: row.stock,
    featured: row.featured,
    colorAccent: row.color_accent ?? undefined,
  };
}

function groupImages(
  images: ImageSelect[] | null | undefined,
): Map<string, ImageSelect[]> {
  const out = new Map<string, ImageSelect[]>();
  for (const img of images ?? []) {
    const arr = out.get(img.product_id) ?? [];
    arr.push(img);
    out.set(img.product_id, arr);
  }
  return out;
}

export async function getProducts(locale: Locale): Promise<Product[]> {
  const client = supabaseAnon();
  const [productsRes, imagesRes] = await Promise.all([
    client
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    client.from("product_images").select("product_id, path, position"),
  ]);
  const rows = (productsRes.data ?? []) as ProductSelect[];
  const byProduct = groupImages(imagesRes.data as ImageSelect[] | null);
  return rows.map((r) => toProduct(r, byProduct.get(r.id) ?? [], locale));
}

export async function getProduct(
  slug: string,
  locale: Locale,
): Promise<Product | undefined> {
  const client = supabaseAnon();
  const { data: row } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!row) return undefined;
  const product = row as ProductSelect;
  const { data: images } = await client
    .from("product_images")
    .select("product_id, path, position")
    .eq("product_id", product.id);
  return toProduct(product, (images ?? []) as ImageSelect[], locale);
}

export async function getFeaturedProducts(locale: Locale): Promise<Product[]> {
  const client = supabaseAnon();
  const { data: rows } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: true });
  const products = (rows ?? []) as ProductSelect[];
  if (products.length === 0) return [];
  const { data: images } = await client
    .from("product_images")
    .select("product_id, path, position")
    .in(
      "product_id",
      products.map((p) => p.id),
    );
  const byProduct = groupImages(images as ImageSelect[] | null);
  return products.map((r) => toProduct(r, byProduct.get(r.id) ?? [], locale));
}

export async function getProductsBySlugs(
  slugs: string[],
  locale: Locale,
): Promise<Map<string, Product>> {
  const unique = Array.from(new Set(slugs));
  if (unique.length === 0) return new Map();
  const client = supabaseAnon();
  const { data: rows } = await client
    .from("products")
    .select(PRODUCT_COLUMNS)
    .in("slug", unique);
  const products = (rows ?? []) as ProductSelect[];
  const { data: images } =
    products.length === 0
      ? { data: [] }
      : await client
          .from("product_images")
          .select("product_id, path, position")
          .in(
            "product_id",
            products.map((p) => p.id),
          );
  const byProduct = groupImages(images as ImageSelect[] | null);
  const result = new Map<string, Product>();
  for (const r of products) {
    result.set(r.slug, toProduct(r, byProduct.get(r.id) ?? [], locale));
  }
  return result;
}

export async function getProductSlugs(): Promise<string[]> {
  const client = supabaseAnon();
  const { data } = await client.from("products").select("slug").eq("active", true);
  return (data ?? []).map((r) => r.slug);
}
