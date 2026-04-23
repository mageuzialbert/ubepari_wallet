-- Ubepari Wallet — layaway pivot.
-- Replaces hire-purchase orders/installments with save-toward-a-goal model, and
-- adds password-auth columns on profiles so users can log in with phone+password
-- in addition to OTP.
-- Apply via Supabase SQL editor.

begin;

-- ============================================================
-- Enum: goal status
-- ============================================================

create type public.goal_status as enum ('active', 'completed', 'cancelled');

-- ============================================================
-- payments: new kind value so contributions don't reuse 'topup'
-- (topup was a free-floating wallet credit; contribution is linked to a goal).
-- ============================================================

alter type public.payment_kind add value if not exists 'contribution';

-- ============================================================
-- goals — one row per active/complete/cancelled savings plan
-- ============================================================

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  product_slug text not null,
  product_price_tzs integer not null check (product_price_tzs > 0),
  target_months smallint not null check (target_months in (3, 6, 9, 12)),
  monthly_target_tzs integer not null check (monthly_target_tzs > 0),
  contributed_tzs integer not null default 0 check (contributed_tzs >= 0),
  status public.goal_status not null default 'active',
  reference text not null unique,
  next_reminder_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  receipt_number text unique,
  receipt_issued_at timestamptz
);

create index goals_user_idx on public.goals (user_id, created_at desc);
create index goals_status_idx on public.goals (status);
create index goals_reminder_idx
  on public.goals (next_reminder_date)
  where status = 'active' and next_reminder_date is not null;

alter table public.goals enable row level security;

create policy "goals_select_own"
on public.goals for select to authenticated
using (auth.uid() = user_id);

-- writes: service-role only

-- ============================================================
-- payments.goal_id — link every contribution to its goal
-- ============================================================

alter table public.payments
  add column goal_id uuid references public.goals(id) on delete set null;

create index payments_goal_id_idx on public.payments (goal_id);

-- ============================================================
-- Atomic contribution increment.
-- Returns the updated goal row so callers can read the new total + status.
-- Runs as SECURITY DEFINER so settlement (service-role) can call it cleanly.
-- ============================================================

create or replace function public.increment_goal_contribution(
  p_goal_id uuid,
  p_amount integer
)
returns public.goals
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.goals;
begin
  update public.goals
     set contributed_tzs = contributed_tzs + p_amount
   where id = p_goal_id
     and status = 'active'
  returning * into updated;
  return updated;
end;
$$;

revoke all on function public.increment_goal_contribution(uuid, integer) from public;
grant execute on function public.increment_goal_contribution(uuid, integer) to service_role;

-- ============================================================
-- profiles — password-login columns (alongside existing OTP path)
-- ============================================================

alter table public.profiles
  add column password_hash text,
  add column password_set_at timestamptz,
  add column password_failed_attempts smallint not null default 0,
  add column password_locked_until timestamptz;

commit;
