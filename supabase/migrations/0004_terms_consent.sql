-- Ubepari Wallet — signup consent tracking.
-- Records which version of the legal docs a user accepted and when.
-- Apply via Supabase SQL editor.

begin;

alter table public.profiles
  add column terms_version_accepted text,
  add column terms_accepted_at timestamptz;

commit;
