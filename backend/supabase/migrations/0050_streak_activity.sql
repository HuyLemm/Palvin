-- PALVIN — TikTok-style streak: only counts a day when BOTH partners did
-- something (any active interaction, not just opening the app / viewing).
-- Replaces the old "bump once per app-load" behaviour from
-- 0022_couple_streak_and_anniversary.sql (bump_streak() stays in place but
-- is no longer called from the app).

create table if not exists streak_activity (
  couple_id   uuid not null references couples(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  active_date date not null,
  primary key (couple_id, profile_id, active_date)
);

alter table streak_activity enable row level security;

create policy "member can read own couple streak activity" on streak_activity
  for select using (couple_id = auth_couple_id());
create policy "member can log own streak activity" on streak_activity
  for insert with check (couple_id = auth_couple_id() and profile_id = auth.uid());

-- Called once per qualifying user action (see context.tsx's toast()).
-- Logs today's activity for the caller, and only when EVERY profile in the
-- couple has logged today does it advance the shared streak_count using the
-- same +1-if-yesterday / reset-to-1-otherwise logic as the old bump_streak().
create or replace function mark_active_today()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid := auth_couple_id();
  last_date date;
  cnt int;
  everyone_active boolean;
begin
  if cid is null then
    return 0;
  end if;

  insert into streak_activity (couple_id, profile_id, active_date)
  values (cid, auth.uid(), current_date)
  on conflict (couple_id, profile_id, active_date) do nothing;

  select streak_last_active, streak_count into last_date, cnt from couples where id = cid;
  cnt := coalesce(cnt, 0);

  if last_date = current_date then
    return cnt;
  end if;

  select not exists (
    select 1 from profiles p
    where p.couple_id = cid
      and not exists (
        select 1 from streak_activity sa
        where sa.couple_id = cid and sa.profile_id = p.id and sa.active_date = current_date
      )
  ) into everyone_active;

  if not everyone_active then
    return cnt;
  end if;

  if last_date = current_date - 1 then
    cnt := cnt + 1;
  else
    cnt := 1;
  end if;

  update couples set streak_count = cnt, streak_last_active = current_date where id = cid;
  return cnt;
end;
$$;

notify pgrst, 'reload schema';
