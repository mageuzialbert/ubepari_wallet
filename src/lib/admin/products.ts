import "server-only";

import { logAdmin } from "@/lib/audit";
import { logEvent } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseAnon } from "@/lib/supabase/anon";

const BRANDS = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "MSI", "Acer", "Custom"] as const;
export type Brand = (typeof BRANDS)[number];

const USAGE_TAGS = ["Gaming", "Design", "Coding", "Office", "Student", "Creator"] as const;
export type UsageTag = (typeof USAGE_TAGS)[number];

const SPEC_KEYS = [
  "cpu",
  "cpuGeneration",
  "ram",
  "storage",
  "gpu",
  "display",
  "os",
  "weight",
] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];
export type ProductSpecs = Record<SpecKey, string>;

export const MAX_IMAGES_PER_PRODUCT = 8;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ProductInput = {
  name_en: string;
  name_sw: string;
  slug: string;
  brand: Brand;
  tagline_en: string;
  tagline_sw: string;
  description_en: string;
  description_sw: string;
  cash_price_tzs: number;
  stock: number;
  featured: boolean;
  active: boolean;
  color_accent: string | null;
  specs: ProductSpecs;
  usage_tags: UsageTag[];
};

export type AdminProductRow = {
  id: string;
  slug: string;
  brand: string;
  name_en: string;
  name_sw: string;
  cash_price_tzs: number;
  stock: number;
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  primary_image_url: string | null;
};

export type AdminProductImage = {
  id: string;
  path: string;
  position: number;
  alt_en: string | null;
  alt_sw: string | null;
  url: string;
};

export type AdminProductDetail = {
  id: string;
  slug: string;
  brand: Brand;
  name_en: string;
  name_sw: string;
  tagline_en: string;
  tagline_sw: string;
  description_en: string;
  description_sw: string;
  cash_price_tzs: number;
  stock: number;
  featured: boolean;
  active: boolean;
  color_accent: string | null;
  specs: ProductSpecs;
  usage_tags: UsageTag[];
  created_at: string;
  updated_at: string;
  images: AdminProductImage[];
  referenced_by_order: boolean;
};

export type AdminProductError =
  | "not_found"
  | "slug_in_use"
  | "slug_locked"
  | "bad_input"
  | "image_limit"
  | "image_not_found"
  | "storage_error"
  | "unknown";

export type AdminProductResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: AdminProductError; issues?: Record<string, string> };

type ListFilters = {
  search?: string;
  brand?: string;
  status?: "active" | "inactive" | "all";
};

const LIST_LIMIT = 200;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function publicUrl(path: string): string {
  return supabaseAnon().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isBrand(value: string): value is Brand {
  return (BRANDS as readonly string[]).includes(value);
}

function isUsageTag(value: string): value is UsageTag {
  return (USAGE_TAGS as readonly string[]).includes(value);
}

export function validateProductInput(raw: unknown): AdminProductResult<ProductInput> {
  const issues: Record<string, string> = {};
  const r = (raw ?? {}) as Record<string, unknown>;

  const name_en = trim(r.name_en);
  const name_sw = trim(r.name_sw);
  const slug = trim(r.slug).toLowerCase();
  const brandRaw = trim(r.brand);
  const tagline_en = trim(r.tagline_en);
  const tagline_sw = trim(r.tagline_sw);
  const description_en = trim(r.description_en);
  const description_sw = trim(r.description_sw);
  const priceRaw = r.cash_price_tzs;
  const stockRaw = r.stock;
  const colorRaw = typeof r.color_accent === "string" ? r.color_accent.trim() : null;
  const specsRaw = (r.specs ?? {}) as Record<string, unknown>;
  const tagsRaw = Array.isArray(r.usage_tags) ? (r.usage_tags as unknown[]) : [];

  if (name_en.length < 2 || name_en.length > 80) issues.name_en = "length";
  if (name_sw.length < 2 || name_sw.length > 80) issues.name_sw = "length";
  if (slug.length < 2 || slug.length > 60 || !SLUG_RE.test(slug)) issues.slug = "format";
  if (!isBrand(brandRaw)) issues.brand = "enum";
  if (tagline_en.length < 2 || tagline_en.length > 140) issues.tagline_en = "length";
  if (tagline_sw.length < 2 || tagline_sw.length > 140) issues.tagline_sw = "length";
  if (description_en.length < 10 || description_en.length > 2000) {
    issues.description_en = "length";
  }
  if (description_sw.length < 10 || description_sw.length > 2000) {
    issues.description_sw = "length";
  }

  const price = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
  if (!Number.isInteger(price) || price < 10_000 || price > 100_000_000) {
    issues.cash_price_tzs = "range";
  }

  const stock = typeof stockRaw === "number" ? stockRaw : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0 || stock > 10_000) {
    issues.stock = "range";
  }

  const color =
    !colorRaw || colorRaw.length === 0
      ? null
      : /^#[0-9a-fA-F]{6}$/.test(colorRaw)
        ? colorRaw
        : (issues.color_accent = "format", null);

  const specs: ProductSpecs = {
    cpu: "",
    cpuGeneration: "",
    ram: "",
    storage: "",
    gpu: "",
    display: "",
    os: "",
    weight: "",
  };
  for (const key of SPEC_KEYS) {
    const value = trim(specsRaw[key]);
    if (value.length < 1 || value.length > 80) {
      issues[`specs.${key}`] = "length";
    }
    specs[key] = value;
  }

  const usage_tags: UsageTag[] = [];
  for (const candidate of tagsRaw) {
    if (typeof candidate === "string" && isUsageTag(candidate) && !usage_tags.includes(candidate)) {
      usage_tags.push(candidate);
    }
  }
  if (usage_tags.length === 0) issues.usage_tags = "required";

  if (Object.keys(issues).length > 0) {
    return { ok: false, error: "bad_input", issues };
  }

  return {
    ok: true,
    data: {
      name_en,
      name_sw,
      slug,
      brand: brandRaw as Brand,
      tagline_en,
      tagline_sw,
      description_en,
      description_sw,
      cash_price_tzs: price,
      stock,
      featured: Boolean(r.featured),
      active: r.active === undefined ? true : Boolean(r.active),
      color_accent: color,
      specs,
      usage_tags,
    },
  };
}

export async function listAdminProducts(filters: ListFilters = {}): Promise<AdminProductRow[]> {
  const admin = supabaseAdmin();
  let query = admin
    .from("products")
    .select(
      "id, slug, brand, name_en, name_sw, cash_price_tzs, stock, featured, active, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filters.status === "active") query = query.eq("active", true);
  else if (filters.status === "inactive") query = query.eq("active", false);

  if (filters.brand && filters.brand.length > 0) query = query.eq("brand", filters.brand);

  const q = filters.search?.trim();
  if (q && q.length > 0) {
    const pattern = `%${q.replace(/[%,]/g, "")}%`;
    query = query.or(
      [
        `name_en.ilike.${pattern}`,
        `name_sw.ilike.${pattern}`,
        `slug.ilike.${pattern}`,
        `brand.ilike.${pattern}`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin-products] list failed", error);
    return [];
  }
  const rows = (data ?? []) as Array<Omit<AdminProductRow, "primary_image_url">>;
  if (rows.length === 0) return [];

  const { data: images } = await admin
    .from("product_images")
    .select("product_id, path, position")
    .in(
      "product_id",
      rows.map((r) => r.id),
    )
    .order("position", { ascending: true });

  const primary = new Map<string, string>();
  for (const img of images ?? []) {
    if (!primary.has(img.product_id)) primary.set(img.product_id, img.path);
  }

  return rows.map((row) => ({
    ...row,
    primary_image_url: primary.has(row.id) ? publicUrl(primary.get(row.id)!) : null,
  }));
}

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  const admin = supabaseAdmin();
  const { data: row, error } = await admin
    .from("products")
    .select(
      "id, slug, brand, name_en, name_sw, tagline_en, tagline_sw, description_en, description_sw, cash_price_tzs, stock, featured, active, color_accent, specs, usage_tags, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-products] get failed", error);
    return null;
  }
  if (!row) return null;

  const [{ data: images }, referenced] = await Promise.all([
    admin
      .from("product_images")
      .select("id, path, position, alt_en, alt_sw")
      .eq("product_id", row.id)
      .order("position", { ascending: true }),
    hasOrderForSlug(row.slug),
  ]);

  const specs = sanitizeSpecs(row.specs as Record<string, unknown>);
  const tags = (row.usage_tags ?? []).filter(isUsageTag) as UsageTag[];

  return {
    id: row.id,
    slug: row.slug,
    brand: isBrand(row.brand) ? row.brand : "Custom",
    name_en: row.name_en,
    name_sw: row.name_sw,
    tagline_en: row.tagline_en,
    tagline_sw: row.tagline_sw,
    description_en: row.description_en,
    description_sw: row.description_sw,
    cash_price_tzs: row.cash_price_tzs,
    stock: row.stock,
    featured: row.featured,
    active: row.active,
    color_accent: row.color_accent ?? null,
    specs,
    usage_tags: tags,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: (images ?? []).map((img) => ({
      id: img.id,
      path: img.path,
      position: img.position,
      alt_en: img.alt_en,
      alt_sw: img.alt_sw,
      url: publicUrl(img.path),
    })),
    referenced_by_order: referenced,
  };
}

function sanitizeSpecs(raw: Record<string, unknown> | null | undefined): ProductSpecs {
  const out: ProductSpecs = {
    cpu: "",
    cpuGeneration: "",
    ram: "",
    storage: "",
    gpu: "",
    display: "",
    os: "",
    weight: "",
  };
  if (!raw) return out;
  for (const key of SPEC_KEYS) {
    const value = raw[key];
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

async function hasOrderForSlug(slug: string): Promise<boolean> {
  const { count } = await supabaseAdmin()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("product_slug", slug);
  return (count ?? 0) > 0;
}

async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabaseAdmin().from("products").select("id").eq("slug", slug).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

export async function createProduct(
  rawInput: unknown,
  actorId: string,
): Promise<AdminProductResult<{ id: string; slug: string }>> {
  const parsed = validateProductInput(rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.data;

  if (await slugExists(input.slug)) {
    return { ok: false, error: "slug_in_use" };
  }

  const admin = supabaseAdmin();
  const { data: inserted, error } = await admin
    .from("products")
    .insert({
      slug: input.slug,
      brand: input.brand,
      name_en: input.name_en,
      name_sw: input.name_sw,
      tagline_en: input.tagline_en,
      tagline_sw: input.tagline_sw,
      description_en: input.description_en,
      description_sw: input.description_sw,
      cash_price_tzs: input.cash_price_tzs,
      stock: input.stock,
      featured: input.featured,
      active: input.active,
      color_accent: input.color_accent,
      specs: input.specs as unknown as Record<string, unknown>,
      usage_tags: input.usage_tags,
    })
    .select("id, slug")
    .maybeSingle();

  if (error || !inserted) {
    console.error("[admin-products] create failed", error);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId,
    action: "product.create",
    targetTable: "products",
    targetId: inserted.id,
    diff: { slug: input.slug, brand: input.brand, name_en: input.name_en },
  });

  return { ok: true, data: { id: inserted.id, slug: inserted.slug } };
}

export async function updateProduct(
  id: string,
  rawInput: unknown,
  actorId: string,
): Promise<AdminProductResult<void>> {
  const parsed = validateProductInput(rawInput);
  if (!parsed.ok) return parsed;
  const input = parsed.data;

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("products")
    .select(
      "id, slug, brand, name_en, name_sw, tagline_en, tagline_sw, description_en, description_sw, cash_price_tzs, stock, featured, active, color_accent, specs, usage_tags",
    )
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "not_found" };

  const slugChanging = existing.slug !== input.slug;
  if (slugChanging) {
    if (await hasOrderForSlug(existing.slug)) return { ok: false, error: "slug_locked" };
    if (await slugExists(input.slug, id)) return { ok: false, error: "slug_in_use" };
  }

  const { error } = await admin
    .from("products")
    .update({
      slug: input.slug,
      brand: input.brand,
      name_en: input.name_en,
      name_sw: input.name_sw,
      tagline_en: input.tagline_en,
      tagline_sw: input.tagline_sw,
      description_en: input.description_en,
      description_sw: input.description_sw,
      cash_price_tzs: input.cash_price_tzs,
      stock: input.stock,
      featured: input.featured,
      active: input.active,
      color_accent: input.color_accent,
      specs: input.specs as unknown as Record<string, unknown>,
      usage_tags: input.usage_tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[admin-products] update failed", error);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId,
    action: "product.update",
    targetTable: "products",
    targetId: id,
    diff: diffInput(existing, input),
  });

  return { ok: true, data: undefined };
}

function diffInput(
  before: Record<string, unknown>,
  after: ProductInput,
): Record<string, unknown> {
  const changed: Record<string, unknown> = {};
  const pairs: Array<[string, unknown, unknown]> = [
    ["slug", before.slug, after.slug],
    ["brand", before.brand, after.brand],
    ["name_en", before.name_en, after.name_en],
    ["name_sw", before.name_sw, after.name_sw],
    ["tagline_en", before.tagline_en, after.tagline_en],
    ["tagline_sw", before.tagline_sw, after.tagline_sw],
    ["description_en", before.description_en, after.description_en],
    ["description_sw", before.description_sw, after.description_sw],
    ["cash_price_tzs", before.cash_price_tzs, after.cash_price_tzs],
    ["stock", before.stock, after.stock],
    ["featured", before.featured, after.featured],
    ["active", before.active, after.active],
    ["color_accent", before.color_accent ?? null, after.color_accent],
  ];
  for (const [key, from, to] of pairs) {
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changed[key] = { from, to };
    }
  }
  if (JSON.stringify(before.specs) !== JSON.stringify(after.specs)) {
    changed.specs = { from: before.specs, to: after.specs };
  }
  if (JSON.stringify(before.usage_tags) !== JSON.stringify(after.usage_tags)) {
    changed.usage_tags = { from: before.usage_tags, to: after.usage_tags };
  }
  return changed;
}

export async function softDeleteProduct(
  id: string,
  actorId: string,
): Promise<AdminProductResult<void>> {
  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("products")
    .select("id, slug, active")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "not_found" };

  if (existing.active === false) {
    return { ok: true, data: undefined };
  }

  const { error } = await admin
    .from("products")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[admin-products] soft delete failed", error);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId,
    action: "product.delete",
    targetTable: "products",
    targetId: id,
    diff: { slug: existing.slug, active: { from: true, to: false } },
  });

  return { ok: true, data: undefined };
}

export async function uploadProductImage(
  productId: string,
  file: File,
  actorId: string,
): Promise<AdminProductResult<{ imageId: string; path: string; url: string }>> {
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "bad_input", issues: { file: "size" } };
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "bad_input", issues: { file: "type" } };
  }

  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "not_found" };

  const { data: current } = await admin
    .from("product_images")
    .select("id, position")
    .eq("product_id", productId)
    .order("position", { ascending: false });

  const count = current?.length ?? 0;
  if (count >= MAX_IMAGES_PER_PRODUCT) return { ok: false, error: "image_limit" };
  const nextPosition = count === 0 ? 0 : (current![0].position ?? 0) + 1;

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${productId}/${nextPosition}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await admin.storage
    .from("product-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upload.error) {
    console.error("[admin-products] image upload failed", upload.error);
    return { ok: false, error: "storage_error" };
  }

  const { data: inserted, error } = await admin
    .from("product_images")
    .insert({ product_id: productId, path, position: nextPosition })
    .select("id")
    .maybeSingle();

  if (error || !inserted) {
    await admin.storage.from("product-images").remove([path]).catch(() => undefined);
    console.error("[admin-products] image row insert failed", error);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId,
    action: "product.image.upload",
    targetTable: "product_images",
    targetId: inserted.id,
    diff: { product_id: productId, path, position: nextPosition },
  });

  return { ok: true, data: { imageId: inserted.id, path, url: publicUrl(path) } };
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
  actorId: string,
): Promise<AdminProductResult<void>> {
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("product_images")
    .select("id, product_id, path")
    .eq("id", imageId)
    .maybeSingle();
  if (!row || row.product_id !== productId) return { ok: false, error: "image_not_found" };

  const { error: delErr } = await admin.from("product_images").delete().eq("id", imageId);
  if (delErr) {
    console.error("[admin-products] image delete failed", delErr);
    return { ok: false, error: "unknown" };
  }

  const storageRes = await admin.storage.from("product-images").remove([row.path]);
  if (storageRes.error) {
    console.error("[admin-products] storage remove failed", storageRes.error);
  }

  await logAdmin({
    actorId,
    action: "product.image.delete",
    targetTable: "product_images",
    targetId: imageId,
    diff: { product_id: productId, path: row.path },
  });

  return { ok: true, data: undefined };
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[],
  actorId: string,
): Promise<AdminProductResult<void>> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "bad_input" };
  }

  const admin = supabaseAdmin();
  const { data: rows } = await admin
    .from("product_images")
    .select("id")
    .eq("product_id", productId);

  const existingIds = new Set((rows ?? []).map((r) => r.id));
  if (orderedIds.length !== existingIds.size) return { ok: false, error: "bad_input" };
  for (const id of orderedIds) {
    if (!existingIds.has(id)) return { ok: false, error: "bad_input" };
  }

  const bumpBase = 1000;
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin
      .from("product_images")
      .update({ position: bumpBase + i })
      .eq("id", orderedIds[i]);
    if (error) {
      console.error("[admin-products] reorder bump failed", error);
      return { ok: false, error: "unknown" };
    }
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin
      .from("product_images")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) {
      console.error("[admin-products] reorder compact failed", error);
      return { ok: false, error: "unknown" };
    }
  }

  await logAdmin({
    actorId,
    action: "product.image.reorder",
    targetTable: "product_images",
    targetId: productId,
    diff: { order: orderedIds },
  });

  return { ok: true, data: undefined };
}

export async function updateImageAlt(
  productId: string,
  imageId: string,
  patch: { alt_en?: string | null; alt_sw?: string | null },
  actorId: string,
): Promise<AdminProductResult<void>> {
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("product_images")
    .select("id, product_id, alt_en, alt_sw")
    .eq("id", imageId)
    .maybeSingle();
  if (!row || row.product_id !== productId) return { ok: false, error: "image_not_found" };

  const alt_en =
    patch.alt_en === undefined ? row.alt_en : patch.alt_en ? patch.alt_en.slice(0, 160) : null;
  const alt_sw =
    patch.alt_sw === undefined ? row.alt_sw : patch.alt_sw ? patch.alt_sw.slice(0, 160) : null;

  const { error } = await admin
    .from("product_images")
    .update({ alt_en, alt_sw })
    .eq("id", imageId);
  if (error) {
    console.error("[admin-products] image alt update failed", error);
    return { ok: false, error: "unknown" };
  }

  await logAdmin({
    actorId,
    action: "product.update",
    targetTable: "product_images",
    targetId: imageId,
    diff: { alt_en, alt_sw },
  });

  logEvent("product.image_alt_updated", { productId, imageId });
  return { ok: true, data: undefined };
}

export const ADMIN_BRANDS = BRANDS;
export const ADMIN_USAGE_TAGS = USAGE_TAGS;
export const ADMIN_SPEC_KEYS = SPEC_KEYS;
