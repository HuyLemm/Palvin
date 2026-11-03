-- PALVIN — daily push reminders for calendar events and relationship milestones.
--
-- Same pattern as the debt reminder (0088): one pg_cron job at 8am Asia/Ho_Chi_Minh
-- (01:00 UTC) calls the existing send-push edge function through pg_net for every
-- profile in the couple. Nothing here changes the app's tables.
--
--   * Events that happen TODAY      -> "Today: <title>"     (+ time / place)
--   * Events that happen TOMORROW   -> "Tomorrow: <title>"  (+ time / place)
--     Repeating events (weekly / monthly / yearly) are matched against their
--     anchor date; a monthly event on the 29th–31st is skipped in shorter months.
--   * Every 100th day together and every anniversary -> "Day 1,000 🎉" / "2 years together 🎂"
--
-- Requires: pg_cron + pg_net (already used by 0083/0088) and the app_config rows
-- push_function_url / push_secret. Without them the functions return quietly.
--
-- Apply via: supabase db push   (or paste into the Dashboard SQL editor).

create or replace function event_occurs_on(anchor date, rec text, d date)
returns boolean
language sql
immutable
as $$
  select case rec
    when 'none'    then anchor = d
    when 'weekly'  then d >= anchor and (d - anchor) % 7 = 0
    when 'monthly' then d >= anchor and extract(day from d) = extract(day from anchor)
    when 'yearly'  then d >= anchor
                        and extract(month from d) = extract(month from anchor)
                        and extract(day from d) = extract(day from anchor)
    else false
  end;
$$;

create or replace function remind_upcoming_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  e record;
  p record;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  target date;
  headline text;
  detail text;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return; -- not configured in this environment — no-op
  end if;

  for e in select * from calendar_events loop
    foreach target in array array[today, today + 1] loop
      if event_occurs_on(e.event_date, e.recurrence, target) then
        headline := (case when target = today then 'Today: ' else 'Tomorrow: ' end) || e.title;
        detail := trim(both ' ·' from
          coalesce(to_char(e.event_time, 'HH24:MI'), '')
          || (case when coalesce(e.location, '') <> '' then ' · ' || e.location else '' end));
        for p in select id from profiles where couple_id = e.couple_id loop
          perform net.http_post(
            url := push_url,
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
            body := jsonb_build_object('profileId', p.id, 'title', headline, 'body', detail, 'url', '/'),
            timeout_milliseconds := 15000
          );
        end loop;
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function remind_relationship_milestones()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  c record;
  p record;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  day_no int;
  years int;
  headline text;
  detail text;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return;
  end if;

  for c in select id, relationship_start from couples where relationship_start is not null loop
    day_no := (today - c.relationship_start) + 1;   -- the app counts the start date as Day 1
    years := extract(year from age(today, c.relationship_start))::int;
    headline := null;

    if years >= 1
       and extract(month from today) = extract(month from c.relationship_start)
       and extract(day from today) = extract(day from c.relationship_start) then
      headline := years || (case when years = 1 then ' year' else ' years' end) || ' together 🎂';
      detail := 'Happy anniversary!';
    elsif day_no > 0 and day_no % 100 = 0 then
      headline := 'Day ' || trim(to_char(day_no, 'FM999,999')) || ' 🎉';
      detail := 'Another milestone for the two of you.';
    end if;

    if headline is not null then
      for p in select id from profiles where couple_id = c.id loop
        perform net.http_post(
          url := push_url,
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
          body := jsonb_build_object('profileId', p.id, 'title', headline, 'body', detail, 'url', '/'),
          timeout_milliseconds := 15000
        );
      end loop;
    end if;
  end loop;
end;
$$;

select cron.unschedule('remind-upcoming-events')
where exists (select 1 from cron.job where jobname = 'remind-upcoming-events');
select cron.schedule('remind-upcoming-events', '0 1 * * *', $$select remind_upcoming_events();$$);

select cron.unschedule('remind-relationship-milestones')
where exists (select 1 from cron.job where jobname = 'remind-relationship-milestones');
select cron.schedule('remind-relationship-milestones', '5 1 * * *', $$select remind_relationship_milestones();$$);

notify pgrst, 'reload schema';
