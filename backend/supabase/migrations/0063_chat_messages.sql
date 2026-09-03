-- PALVIN — Direct chat between the two partners (Instagram-DM-style).
-- One thread per couple (not per-conversation — there's only ever the two
-- of them), so `couple_id` alone identifies the whole thread.

create table chat_messages (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references couples(id) on delete cascade default auth_couple_id(),
  sender_profile_id  uuid not null references profiles(id),
  text               text not null,
  created_at         timestamptz not null default now(),
  read_at            timestamptz
);

create index chat_messages_couple_created_idx on chat_messages (couple_id, created_at);

alter table chat_messages enable row level security;

create policy "couple full access" on chat_messages for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- Realtime — new messages and read-receipt updates both need to push live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
end $$;

notify pgrst, 'reload schema';
