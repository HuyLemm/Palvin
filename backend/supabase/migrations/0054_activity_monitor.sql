-- PALVIN — Replace the mutual "Activity Status" toggle (just removed from
-- Settings) with a simpler concept: `profiles.last_active_at` is now touched
-- directly by the client on every page visit (see auth.ts's touchLastActive,
-- called once per app session in context.tsx) — nothing to do with the
-- "did a real action" bar used for streaks, so mark_active_today() no longer
-- needs to touch it too. `show_activity_status` is no longer read anywhere;
-- left in place rather than a forced DROP COLUMN.

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
