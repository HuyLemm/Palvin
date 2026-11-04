-- PALVIN — gentle, contextual pushes.
--
--   * When one partner answers the question of the day, the other gets a notification
--     (a row in `notifications`, which the existing push trigger from 0066 turns into a push).
--   * 20:00 Asia/Ho_Chi_Minh: a reminder to anyone who has not answered today's question yet.
--   * 08:00 Asia/Ho_Chi_Minh: "On this day" — a memory from the same calendar day in an earlier year.
--   * Sunday 20:00 Asia/Ho_Chi_Minh: a short weekly recap (memories added, money spent, questions
--     answered together) sent to both partners.
--
-- Same pattern as 0093: pg_cron + pg_net call the existing send-push function using the
-- app_config rows push_function_url / push_secret; without them the jobs return quietly.
--
-- Apply via the Dashboard SQL editor or `supabase db query --remote -f <this file>`
-- (production has no migration history, so do NOT use `supabase db push`).

create or replace function notify_partner_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  select display_name into who from profiles where id = new.profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '💬', coalesce(who, 'Your partner') || ' answered today''s question', new.profile_id, 'home', 'daily');
  return new;
end;
$$;

drop trigger if exists on_daily_answer_notify on daily_answers;
create trigger on_daily_answer_notify
  after insert on daily_answers
  for each row execute function notify_partner_answered();

create or replace function remind_unanswered_question()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  p record;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return;
  end if;

  for p in
    select pr.id from profiles pr
    where pr.couple_id is not null
      and not exists (select 1 from daily_answers a where a.profile_id = pr.id and a.answer_date = today)
  loop
    perform net.http_post(
      url := push_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
      body := jsonb_build_object('profileId', p.id, 'title', 'Today''s question is waiting 💬', 'body', 'Answer it to see your partner''s answer.', 'url', '/'),
      timeout_milliseconds := 15000
    );
  end loop;
end;
$$;

create or replace function send_weekly_recap()
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
  since date := (now() at time zone 'Asia/Ho_Chi_Minh')::date - 6;
  mem_n int;
  spent numeric;
  both_n int;
  body_txt text;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return;
  end if;

  for c in select id from couples loop
    select count(*) into mem_n from memories where couple_id = c.id and (created_at at time zone 'Asia/Ho_Chi_Minh')::date >= since;
    select coalesce(sum(amount), 0) into spent from expenses where couple_id = c.id and type = 'expense' and occurred_on >= since;
    select count(*) into both_n from (
      select answer_date from daily_answers where couple_id = c.id and answer_date >= since
      group by answer_date having count(distinct profile_id) >= 2
    ) d;

    if mem_n = 0 and spent = 0 and both_n = 0 then
      continue; -- nothing happened; stay quiet
    end if;

    body_txt := trim(both ' ·' from
      (case when mem_n > 0 then mem_n || (case when mem_n = 1 then ' memory' else ' memories' end) || ' added' else '' end)
      || (case when spent > 0 then ' · ' || trim(to_char(spent, 'FM999,999,999,999')) || 'đ spent' else '' end)
      || (case when both_n > 0 then ' · ' || both_n || (case when both_n = 1 then ' question' else ' questions' end) || ' answered together' else '' end));

    for p in select id from profiles where couple_id = c.id loop
      perform net.http_post(
        url := push_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
        body := jsonb_build_object('profileId', p.id, 'title', 'Your week together 💕', 'body', body_txt, 'url', '/'),
        timeout_milliseconds := 15000
      );
    end loop;
  end loop;
end;
$$;

create or replace function remind_on_this_day()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  m record;
  p record;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  yrs int;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return;
  end if;

  -- one push per couple per day: the oldest matching memory
  for m in
    select distinct on (couple_id) couple_id, title, occurred_on
    from memories
    where occurred_on < today
      and extract(month from occurred_on) = extract(month from today)
      and extract(day from occurred_on) = extract(day from today)
    order by couple_id, occurred_on
  loop
    yrs := extract(year from today)::int - extract(year from m.occurred_on)::int;
    for p in select id from profiles where couple_id = m.couple_id loop
      perform net.http_post(
        url := push_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
        body := jsonb_build_object('profileId', p.id,
          'title', 'On this day, ' || yrs || (case when yrs = 1 then ' year ago' else ' years ago' end) || ' 🌸',
          'body', m.title, 'url', '/'),
        timeout_milliseconds := 15000
      );
    end loop;
  end loop;
end;
$$;

select cron.unschedule('remind-unanswered-question')
where exists (select 1 from cron.job where jobname = 'remind-unanswered-question');
select cron.schedule('remind-unanswered-question', '0 13 * * *', $$select remind_unanswered_question();$$);

select cron.unschedule('remind-on-this-day')
where exists (select 1 from cron.job where jobname = 'remind-on-this-day');
select cron.schedule('remind-on-this-day', '0 1 * * *', $$select remind_on_this_day();$$);

select cron.unschedule('send-weekly-recap')
where exists (select 1 from cron.job where jobname = 'send-weekly-recap');
select cron.schedule('send-weekly-recap', '0 13 * * 0', $$select send_weekly_recap();$$);

-- Let phones hear about a new answer instantly (the app still polls once a minute as a fallback).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'daily_answers') then
    alter publication supabase_realtime add table daily_answers;
  end if;
end $$;

notify pgrst, 'reload schema';
