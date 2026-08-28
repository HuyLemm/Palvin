-- PALVIN — Notifications
-- Scope: exactly what screens/Notifications.tsx + the App.tsx bell badge
-- need, plus persisted per-account notification preferences for Settings.
--
-- Notifications are a shared couple activity feed (not per-recipient
-- personalized alerts) — matches how the app already worked before this
-- migration (one shared list, "read" is shared too). The `notify_prefs`
-- column on `profiles` persists Settings' toggles for real, but does not
-- (yet) suppress the shared feed — that would need per-recipient targeting,
-- which isn't needed until a feature actually requires it.
--
-- Apply via: Supabase Dashboard > SQL Editor > paste this whole file > Run.

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade default auth_couple_id(),
  emoji      text,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "couple full access" on notifications for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

-- Auto-notify the couple whenever a new post is published.
create or replace function notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.author_id;
  insert into notifications (couple_id, emoji, message)
  values (new.couple_id, '📸', coalesce(author_name, 'Ai đó') || ' vừa đăng một bài viết mới.');
  return new;
end;
$$;

drop trigger if exists on_post_created on posts;
create trigger on_post_created
  after insert on posts
  for each row execute function notify_new_post();

-- Persisted per-account notification preferences (Settings screen).
alter table profiles add column if not exists notify_prefs jsonb not null
  default '{"love":true,"memories":true,"expenses":true,"events":true}'::jsonb;

notify pgrst, 'reload schema';
