-- Ubepari Wallet — admin_audit_log.
-- Append-only log of every admin action. Service-role only.
-- Apply via Supabase SQL editor.

begin;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_table text,
  target_id text,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);
create index admin_audit_log_action_idx on public.admin_audit_log (action, created_at desc);
create index admin_audit_log_target_idx
  on public.admin_audit_log (target_table, target_id)
  where target_table is not null;

alter table public.admin_audit_log enable row level security;
-- No policies: service role bypasses RLS; anon/authenticated cannot read or write.

commit;
