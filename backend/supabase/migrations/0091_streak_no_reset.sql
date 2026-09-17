-- PALVIN — a missed day (neither partner active) should NOT reset the
-- streak counter back to 1; it should just mean that day's flame doesn't
-- light (already handled client-side by streak.ts's litToday, derived from
-- streak_last_active === today). mark_active_today() (0050) used to reset
-- streak_count to 1 whenever the couple's last qualifying day wasn't
-- yesterday — so skipping even one day silently wiped out the whole count.
-- Now every day BOTH partners qualify simply adds 1 to whatever the count
-- already was, regardless of how many days it's been since the last one.

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

  cnt := cnt + 1;
  update couples set streak_count = cnt, streak_last_active = current_date where id = cid;
  return cnt;
end;
$$;

notify pgrst, 'reload schema';
