-- Ubepari Wallet — AI assistant persistence.
-- Conversations + messages for signed-in users. Anonymous chat history stays
-- client-side in localStorage and never hits the DB.
-- Apply via Supabase SQL editor.

begin;

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale text not null check (locale in ('en','sw')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null default '',
  tool_calls jsonb,
  tool_call_id text,
  tool_name text,
  created_at timestamptz not null default now()
);

create index ai_conversations_user_idx
  on public.ai_conversations(user_id, updated_at desc);

create index ai_messages_conv_idx
  on public.ai_messages(conversation_id, created_at);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Owners can read, write, update, delete their own conversations.
create policy "own ai conversations"
  on public.ai_conversations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Messages inherit access from the parent conversation.
create policy "own ai messages"
  on public.ai_messages
  for all
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

commit;
