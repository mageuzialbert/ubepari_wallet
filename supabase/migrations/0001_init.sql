-- Ubepari Wallet — schema + RLS + storage bucket.
-- Apply once via Supabase SQL editor or `supabase db push`.

begin;

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Enums
-- ============================================================

create type public.kyc_status as enum ('none', 'pending', 'approved', 'rejected');
create type public.order_status as enum ('pending', 'active', 'completed', 'cancelled');
create type public.payment_kind as enum ('deposit', 'installment', 'topup', 'refund');
create type public.payment_provider as enum ('mpesa', 'tigopesa', 'airtelmoney', 'card');
create type public.payment_status as enum ('pending', 'success', 'failed');
create type public.wallet_entry_kind as enum ('credit', 'debit');

-- ============================================================
-- profiles — 1:1 with auth.users
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null check (phone ~ '^255[0-9]{9}$'),
  first_name text,
  last_name text,
  email text,
  credit_limit_tzs integer not null default 0 check (credit_limit_tzs >= 0),
  credit_points integer not null default 0 check (credit_points >= 0),
  kyc_status public.kyc_status not null default 'none',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (auth.uid() = id) with check (auth.uid() = id);

-- inserts are service-role only (the OTP-verify adapter creates profiles)

-- ============================================================
-- kyc_submissions
-- ============================================================

create table public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nida_number text not null,
  legal_first_name text not null,
  legal_last_name text not null,
  id_doc_path text not null,
  workplace text,
  status public.kyc_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_notes text
);

create index kyc_submissions_user_id_idx on public.kyc_submissions (user_id);
create index kyc_submissions_status_idx on public.kyc_submissions (status) where status = 'pending';

alter table public.kyc_submissions enable row level security;

create policy "kyc_submissions_select_own"
on public.kyc_submissions for select to authenticated
using (auth.uid() = user_id);

create policy "kyc_submissions_insert_own"
on public.kyc_submissions for insert to authenticated
with check (auth.uid() = user_id);

-- updates are service-role only (admin review flow)

-- ============================================================
-- orders
-- ============================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  product_slug text not null,
  plan_months smallint not null check (plan_months in (3, 6, 9, 12)),
  cash_price_tzs integer not null check (cash_price_tzs > 0),
  deposit_tzs integer not null check (deposit_tzs > 0),
  financed_tzs integer not null check (financed_tzs >= 0),
  service_fee_tzs integer not null default 0 check (service_fee_tzs >= 0),
  total_tzs integer not null check (total_tzs > 0),
  monthly_tzs integer not null check (monthly_tzs > 0),
  status public.order_status not null default 'pending',
  reference text not null unique,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  completed_at timestamptz
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

create policy "orders_select_own"
on public.orders for select to authenticated
using (auth.uid() = user_id);

-- writes are service-role only

-- ============================================================
-- payments (declared before order_installments so the FK works)
-- ============================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  kind public.payment_kind not null,
  amount_tzs integer not null check (amount_tzs > 0),
  provider public.payment_provider not null,
  evmark_ref text,
  evmark_reference_id text unique,
  status public.payment_status not null default 'pending',
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index payments_user_id_idx on public.payments (user_id);
create index payments_order_id_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status);

alter table public.payments enable row level security;

create policy "payments_select_own"
on public.payments for select to authenticated
using (auth.uid() = user_id);

-- writes are service-role only

-- ============================================================
-- order_installments
-- ============================================================

create table public.order_installments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sequence smallint not null,
  due_date date not null,
  amount_tzs integer not null check (amount_tzs > 0),
  paid_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  unique (order_id, sequence)
);

create index order_installments_order_id_idx on public.order_installments (order_id);
create index order_installments_due_date_idx on public.order_installments (due_date) where paid_at is null;

alter table public.order_installments enable row level security;

create policy "order_installments_select_via_own_order"
on public.order_installments for select to authenticated
using (
  order_id in (select id from public.orders where user_id = auth.uid())
);

-- writes are service-role only

-- ============================================================
-- wallet_entries
-- note_key matches keys under wallet.activityNotes.* in the dictionary,
-- so the UI localizes from the key instead of storing translated text.
-- ============================================================

create table public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  kind public.wallet_entry_kind not null,
  amount_tzs integer not null check (amount_tzs > 0),
  payment_id uuid references public.payments(id) on delete set null,
  note_key text not null,
  note_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wallet_entries_user_id_idx on public.wallet_entries (user_id);
create index wallet_entries_user_created_idx on public.wallet_entries (user_id, created_at desc);

alter table public.wallet_entries enable row level security;

create policy "wallet_entries_select_own"
on public.wallet_entries for select to authenticated
using (auth.uid() = user_id);

-- writes are service-role only

-- ============================================================
-- otp_challenges — service-role only, no anon/auth policy
-- ============================================================

create table public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null check (phone ~ '^255[0-9]{9}$'),
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts smallint not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now()
);

create index otp_challenges_phone_created_idx on public.otp_challenges (phone, created_at desc);
create index otp_challenges_expires_idx on public.otp_challenges (expires_at) where consumed_at is null;

alter table public.otp_challenges enable row level security;
-- no policies: service role bypasses RLS; nothing else can read/write this table.

-- ============================================================
-- Storage bucket: kyc-documents (private)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy "kyc_documents_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "kyc_documents_select_own_folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- service role has full access via role bypass

commit;
