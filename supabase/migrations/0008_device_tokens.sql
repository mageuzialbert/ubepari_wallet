-- Device push notification tokens, registered by the React Native app.
-- One user can have multiple tokens (different devices, reinstalls).
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists device_tokens_token_unique on public.device_tokens(token)
  where revoked_at is null;
create index if not exists device_tokens_user_active_idx on public.device_tokens(user_id)
  where revoked_at is null;

alter table public.device_tokens enable row level security;

-- Users see and manage only their own active tokens.
create policy "device_tokens_owner_select" on public.device_tokens
  for select using (auth.uid() = user_id);
create policy "device_tokens_owner_insert" on public.device_tokens
  for insert with check (auth.uid() = user_id);
create policy "device_tokens_owner_update" on public.device_tokens
  for update using (auth.uid() = user_id);
