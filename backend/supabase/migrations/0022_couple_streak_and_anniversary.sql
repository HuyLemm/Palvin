-- PALVIN — Couple streak + anniversary date
-- Scope: Home.tsx's "🔥 N day streak" badge (previously per-device
-- localStorage — now one shared counter per couple) and the "Together for"
-- day counter (previously a hardcoded constant in data.ts — now settable by
-- either partner from Settings).

alter table couples add column if not exists streak_count int not null default 0;
alter table couples add column if not exists streak_last_active date;
alter table couples add column if not exists relationship_start date;

-- Atomically bumps the caller's couple streak: +1 if last active yesterday,
-- reset to 1 if the streak lapsed, unchanged if already bumped today.
-- security definer + auth_couple_id() so either partner can safely bump it.
create or replace function bump_streak()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := auth_couple_id();
  last_date date;
  cnt int;
begin
  select streak_last_active, streak_count into last_date, cnt from couples where id = cid;
  if last_date = current_date then
    return cnt;
  elsif last_date = current_date - 1 then
    cnt := cnt + 1;
  else
    cnt := 1;
  end if;
  update couples set streak_count = cnt, streak_last_active = current_date where id = cid;
  return cnt;
end;
$$;

notify pgrst, 'reload schema';
