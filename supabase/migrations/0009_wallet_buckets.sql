-- Ubepari Wallet — wallet-first pivot.
-- Reintroduces a real wallet with two buckets (available, allocated) computed
-- from wallet_entries. Goals are tracked independently but contributions now
-- flow as Available-credit -> Available-debit -> Allocated-credit, so every
-- shilling is visible to the user whether or not it's earmarked to a goal.
-- Cancel+refund moves allocated money back to Available atomically.
-- Apply via Supabase SQL editor.
--
-- Pre-flight audit: this query must return 0 before running the migration.
-- Any row it returns is a settled contribution whose goal was hard-deleted
-- (normally goals are only cancelled, not deleted). Such rows will backfill
-- as bucket='available' instead of 'allocated', understating Allocated.
--   select count(*) from wallet_entries we join payments p on p.id = we.payment_id
--    where we.note_key = 'contribution' and p.goal_id is null;

begin;

-- ============================================================
-- Enum: wallet bucket
-- ============================================================

create type public.wallet_bucket as enum ('available', 'allocated');

-- ============================================================
-- wallet_entries: add bucket + optional allocation target
-- ============================================================

alter table public.wallet_entries
  add column bucket public.wallet_bucket,
  add column allocation_goal_id uuid references public.goals(id) on delete set null;

-- Backfill contribution rows (post-0007). They are credits that already
-- represent money sitting against a goal, so model them as bucket='allocated'
-- using payments.goal_id as the allocation target.
update public.wallet_entries we
   set bucket = 'allocated',
       allocation_goal_id = p.goal_id
  from public.payments p
 where we.payment_id = p.id
   and we.note_key = 'contribution'
   and p.goal_id is not null;

-- Everything else (legacy topup/deposit/installment/refund pairs) is
-- Available-bucket ledger noise.
update public.wallet_entries
   set bucket = 'available'
 where bucket is null;

alter table public.wallet_entries
  alter column bucket set not null;

alter table public.wallet_entries
  add constraint wallet_entries_allocation_requires_bucket
  check (
    (bucket = 'allocated' and allocation_goal_id is not null)
    or (bucket = 'available' and allocation_goal_id is null)
  );

create index wallet_entries_user_bucket_idx
  on public.wallet_entries (user_id, bucket);

-- ============================================================
-- wallet_balances view: one row per user per bucket.
-- security_invoker = on so RLS on wallet_entries flows through.
-- ============================================================

create or replace view public.wallet_balances
  with (security_invoker = on) as
select
  user_id,
  bucket,
  coalesce(
    sum(case when kind = 'credit' then amount_tzs else -amount_tzs end),
    0
  )::bigint as balance_tzs
from public.wallet_entries
group by user_id, bucket;

-- ============================================================
-- increment_goal_contribution: clamp so contributed_tzs never exceeds
-- product_price_tzs. Overshoots would otherwise show up as Allocated
-- residue that the completion debit can't reach.
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
  new_total bigint;
begin
  select * into updated
    from public.goals
   where id = p_goal_id and status = 'active'
   for update;
  if not found then return null; end if;

  new_total := least(updated.contributed_tzs + p_amount, updated.product_price_tzs);

  update public.goals
     set contributed_tzs = new_total
   where id = p_goal_id
  returning * into updated;
  return updated;
end;
$$;

-- ============================================================
-- allocate_to_goal: atomic move of X from Available to a goal's Allocated
-- bucket. Uses an advisory lock on the user to serialize concurrent
-- allocates, and a for-update lock on the goal row.
-- ============================================================

create or replace function public.allocate_to_goal(
  p_user_id uuid,
  p_goal_id uuid,
  p_amount integer
)
returns public.goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available bigint;
  v_goal public.goals;
  v_new_total bigint;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(
      sum(case when kind = 'credit' then amount_tzs else -amount_tzs end),
      0
    )
    into v_available
    from public.wallet_entries
   where user_id = p_user_id and bucket = 'available';

  if v_available < p_amount then
    raise exception 'insufficient_available' using errcode = 'P0001';
  end if;

  select * into v_goal
    from public.goals
   where id = p_goal_id and user_id = p_user_id and status = 'active'
   for update;
  if not found then
    raise exception 'goal_not_active' using errcode = 'P0002';
  end if;

  -- Debit Available
  insert into public.wallet_entries
    (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
  values
    (p_user_id, 'debit', p_amount, 'available', null,
     'allocate_out',
     jsonb_build_object('goalId', p_goal_id, 'goalReference', v_goal.reference));

  -- Credit Allocated
  insert into public.wallet_entries
    (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
  values
    (p_user_id, 'credit', p_amount, 'allocated', p_goal_id,
     'allocate_in',
     jsonb_build_object('goalId', p_goal_id, 'goalReference', v_goal.reference));

  v_new_total := least(v_goal.contributed_tzs + p_amount, v_goal.product_price_tzs);
  update public.goals
     set contributed_tzs = v_new_total
   where id = p_goal_id
  returning * into v_goal;

  return v_goal;
end;
$$;

revoke all on function public.allocate_to_goal(uuid, uuid, integer) from public;
grant execute on function public.allocate_to_goal(uuid, uuid, integer) to service_role;

-- ============================================================
-- cancel_goal_and_refund: flip status to cancelled, zero contributed_tzs,
-- and move the frozen amount back to Available via a debit+credit pair.
-- Zeroing contributed_tzs keeps wallet_balances the single source of truth —
-- the audit history still lives in wallet_entries with allocation_goal_id.
-- ============================================================

create or replace function public.cancel_goal_and_refund(
  p_goal_id uuid,
  p_user_id uuid,
  p_reason text
)
returns public.goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal public.goals;
begin
  select * into v_goal
    from public.goals
   where id = p_goal_id and user_id = p_user_id and status = 'active'
   for update;
  if not found then
    raise exception 'not_active' using errcode = 'P0002';
  end if;

  if v_goal.contributed_tzs > 0 then
    insert into public.wallet_entries
      (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
    values
      (p_user_id, 'debit', v_goal.contributed_tzs, 'allocated', p_goal_id,
       'goal_cancelled',
       jsonb_build_object('goalId', p_goal_id, 'goalReference', v_goal.reference));

    insert into public.wallet_entries
      (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
    values
      (p_user_id, 'credit', v_goal.contributed_tzs, 'available', null,
       'goal_cancelled_refund',
       jsonb_build_object('goalId', p_goal_id, 'goalReference', v_goal.reference));
  end if;

  update public.goals
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = p_reason,
         contributed_tzs = 0
   where id = p_goal_id
  returning * into v_goal;

  return v_goal;
end;
$$;

revoke all on function public.cancel_goal_and_refund(uuid, uuid, text) from public;
grant execute on function public.cancel_goal_and_refund(uuid, uuid, text) to service_role;

commit;
