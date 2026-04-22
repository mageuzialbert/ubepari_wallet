-- Ubepari Wallet — products + product_images + product-images bucket.
-- Migrates the static `lib/products.ts` catalog to a DB-backed catalog.
-- Apply once via Supabase SQL editor, then run `node --env-file=.env.local scripts/seed-products.mjs`.

begin;

-- ============================================================
-- products
-- ============================================================

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  name_en text not null,
  name_sw text not null,
  tagline_en text not null,
  tagline_sw text not null,
  description_en text not null,
  description_sw text not null,
  cash_price_tzs integer not null check (cash_price_tzs > 0),
  specs jsonb not null default '{}'::jsonb,
  usage_tags text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  color_accent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_active_idx on public.products (active) where active = true;
create index products_featured_idx on public.products (featured) where featured = true;

create trigger products_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

create policy "products_select_active"
on public.products for select to anon, authenticated
using (active = true);

-- writes are service-role only (admin CRUD in Phase 11)

-- ============================================================
-- product_images
-- path is a Storage key under the product-images bucket, e.g. "{product_id}/0.jpg"
-- ============================================================

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  position smallint not null default 0 check (position >= 0),
  alt_en text,
  alt_sw text,
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create index product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

create policy "product_images_select_via_active_product"
on public.product_images for select to anon, authenticated
using (
  product_id in (select id from public.products where active = true)
);

-- writes are service-role only

-- ============================================================
-- Storage bucket: product-images (public read)
-- Reads go through the CDN. Writes are service-role only.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

commit;
