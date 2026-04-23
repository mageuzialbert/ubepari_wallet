-- Ubepari Wallet — account soft-delete.
-- On user-initiated deletion we: wipe KYC binary, null phone/email, randomize
-- names, keep orders/payments for accounting retention, and delete the auth
-- user so the phone number is freed for re-signup. Decoupling profiles.id from
-- auth.users.id (drop ON DELETE CASCADE) is what lets the profile survive.
-- Apply via Supabase SQL editor.

begin;

-- 1) Decouple profiles from auth.users.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- 2) Phone is rotated off on deletion. Drop NOT NULL + unique; replace with
--    a partial unique so multiple deleted rows with phone = NULL coexist.
alter table public.profiles
  alter column phone drop not null;

alter table public.profiles
  drop constraint if exists profiles_phone_key;

create unique index if not exists profiles_phone_active_unique
  on public.profiles (phone)
  where phone is not null;

-- 3) Allow NULL to pass the format check.
alter table public.profiles
  drop constraint if exists profiles_phone_check;

alter table public.profiles
  add constraint profiles_phone_check
  check (phone is null or phone ~ '^255[0-9]{9}$');

-- 4) Soft-delete marker.
alter table public.profiles
  add column deleted_at timestamptz;

-- 5) KYC binary wipe tracking. The id_doc_path row stays for audit; the
--    underlying Storage object is removed.
alter table public.kyc_submissions
  add column id_doc_wiped_at timestamptz;

commit;
