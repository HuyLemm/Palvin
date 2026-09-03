-- PALVIN — Activity status (Instagram's "Show Activity Status").
-- Lets each person see when their partner was last active, and a toggle to
-- turn sharing your own off. Piggybacks on mark_active_today() (already
-- called on every real user action, see context.tsx's toast()) so no extra
-- heartbeat call is needed — a genuine interaction is a better signal than
-- "app was merely open" anyway.

alter table profiles add column if not exists last_active_at timestamptz;
alter table profiles add column if not exists show_activity_status boolean not null default true;

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
  update profiles set last_active_at = now() where id = auth.uid();

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
