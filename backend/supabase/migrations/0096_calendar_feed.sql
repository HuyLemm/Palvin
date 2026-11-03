-- PALVIN — subscribable calendar feed.
--
-- Each couple gets one secret token. The calendar-feed edge function turns
-- "…/functions/v1/calendar-feed?token=<token>" into an .ics feed of the couple's
-- events that Apple / Google Calendar can subscribe to and keep refreshed.
-- The token is only readable by the couple (RLS) and can be rotated if the link leaks.
--
-- Apply via: supabase db push   (or paste into the Dashboard SQL editor).

create table if not exists calendar_feed_tokens (
  couple_id  uuid primary key references couples(id) on delete cascade default auth_couple_id(),
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table calendar_feed_tokens enable row level security;

drop policy if exists "couple reads its token" on calendar_feed_tokens;
create policy "couple reads its token" on calendar_feed_tokens for select
  using (couple_id = auth_couple_id());

-- Creates the couple's token on first use and returns it.
create or replace function get_calendar_feed_token()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid;
begin
  insert into calendar_feed_tokens (couple_id) values (auth_couple_id())
  on conflict (couple_id) do nothing;
  select token into t from calendar_feed_tokens where couple_id = auth_couple_id();
  return t;
end;
$$;

-- Invalidates the old link and returns a new token.
create or replace function rotate_calendar_feed_token()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t uuid := gen_random_uuid();
begin
  insert into calendar_feed_tokens (couple_id, token) values (auth_couple_id(), t)
  on conflict (couple_id) do update set token = excluded.token, created_at = now();
  return t;
end;
$$;

notify pgrst, 'reload schema';
