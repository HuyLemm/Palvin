-- PALVIN — Hugs
-- Scope: Home.tsx's "Gửi ôm" / "Đang nghĩ đến em" buttons.
-- Matches original behaviour: sendHug pushed a shared notification — but it
-- did so by hand-appending to local state instead of a real shared channel.
-- Now a real notify trigger inserts into `notifications`, picked up by the
-- existing realtime subscription for both accounts.

create table hugs (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references couples(id) on delete cascade default auth_couple_id(),
  from_profile_id uuid not null references profiles(id),
  message         text not null,
  created_at      timestamptz not null default now()
);

alter table hugs enable row level security;

create policy "couple full access" on hugs for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

create or replace function notify_new_hug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
begin
  select display_name into from_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message)
  values (new.couple_id, '🫂', coalesce(from_name, 'Ai đó') || ' gửi một cái ôm thật chặt! ' || new.message);
  return new;
end;
$$;

drop trigger if exists on_hug_created on hugs;
create trigger on_hug_created
  after insert on hugs
  for each row execute function notify_new_hug();

notify pgrst, 'reload schema';
