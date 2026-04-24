-- Patch 0009: settle the wallet-entry history for goals that completed or
-- cancelled BEFORE the wallet-bucket pivot. Before 0009, completion and
-- cancellation didn't write the close-out debit or the refund pair, so the
-- 0009 backfill leaves those contributions sitting in bucket='allocated'
-- forever, inflating the Allocated balance with money that already shipped
-- (or should be in Available after cancel).
--
-- Idempotent: each branch guards against existing close-out rows by note_key
-- + allocation_goal_id, so re-running is safe.
-- Apply via Supabase SQL editor.

begin;

-- ============================================================
-- 1. Completed goals: synthesize the missing goal_completed debit.
-- One debit row per completed goal at product_price_tzs, tagged to the goal.
-- Only insert where there isn't already one (0009 forward has them).
-- ============================================================

insert into public.wallet_entries
  (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
select
  g.user_id,
  'debit'::public.wallet_entry_kind,
  g.product_price_tzs,
  'allocated'::public.wallet_bucket,
  g.id,
  'goal_completed',
  jsonb_build_object(
    'goalId', g.id,
    'goalReference', g.reference,
    'productSlug', g.product_slug,
    'receiptNumber', g.receipt_number,
    'backfilled', true
  )
from public.goals g
where g.status = 'completed'
  and not exists (
    select 1 from public.wallet_entries we
     where we.allocation_goal_id = g.id
       and we.kind = 'debit'
       and we.bucket = 'allocated'
       and we.note_key = 'goal_completed'
  );

-- ============================================================
-- 2. Cancelled goals with non-zero contributed_tzs: synthesize the
-- refund pair (debit Allocated + credit Available) and zero the goal row.
-- Mirrors cancel_goal_and_refund exactly.
-- ============================================================

with targets as (
  select g.id, g.user_id, g.contributed_tzs, g.reference
    from public.goals g
   where g.status = 'cancelled'
     and g.contributed_tzs > 0
     and not exists (
       select 1 from public.wallet_entries we
        where we.allocation_goal_id = g.id
          and we.kind = 'debit'
          and we.bucket = 'allocated'
          and we.note_key = 'goal_cancelled'
     )
),
debits as (
  insert into public.wallet_entries
    (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
  select
    t.user_id, 'debit', t.contributed_tzs, 'allocated', t.id,
    'goal_cancelled',
    jsonb_build_object('goalId', t.id, 'goalReference', t.reference, 'backfilled', true)
  from targets t
  returning id
),
credits as (
  insert into public.wallet_entries
    (user_id, kind, amount_tzs, bucket, allocation_goal_id, note_key, note_params)
  select
    t.user_id, 'credit', t.contributed_tzs, 'available', null,
    'goal_cancelled_refund',
    jsonb_build_object('goalId', t.id, 'goalReference', t.reference, 'backfilled', true)
  from targets t
  returning id
)
update public.goals g
   set contributed_tzs = 0
  from targets t
 where g.id = t.id;

commit;

-- ============================================================
-- Post-flight sanity: these should all return 0 after the migration.
-- ============================================================
-- select count(*) from public.goals
--  where status='completed' and not exists (
--    select 1 from public.wallet_entries we
--     where we.allocation_goal_id = public.goals.id
--       and we.kind='debit' and we.bucket='allocated'
--       and we.note_key='goal_completed');
--
-- select count(*) from public.goals
--  where status='cancelled' and contributed_tzs > 0;
