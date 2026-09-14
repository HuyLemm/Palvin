-- PALVIN — bump pg_net's http_post timeout from its 5s default to 15s on
-- every trigger that calls the send-push edge function.
--
-- Caught live: the new 11pm daily-reminder cron (0084) fired exactly on
-- schedule and correctly found 2 accounts with incomplete daily to-dos,
-- but BOTH net.http_post calls timed out at 5000ms (net._http_response
-- showed timed_out = true for both, no response ever reached). Chat/
-- generic-notification pushes fire often enough that the edge function
-- stays warm and rarely hits this; a once-a-day cron always hits it cold
-- (importing web-push, setting VAPID, a DB round-trip for subscriptions,
-- then the actual push send), which routinely takes longer than 5s.
-- Applying the same longer timeout to all three since any of them can be
-- the first call after a while and hit the same cold start.

create or replace function remind_incomplete_daily_todos()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  rec record;
  today date := current_date;
  incomplete_count int;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return; -- not configured in this environment — no-op
  end if;

  for rec in
    select p.id as profile_id, p.display_name, p.couple_id
    from profiles p
    where p.couple_id is not null
  loop
    select count(*) into incomplete_count
    from todos t
    where t.couple_id = rec.couple_id
      and t.kind = 'daily'
      and (t.owner = rec.display_name or t.owner = 'Both')
      and t.created_at::date <= today
      and not exists (
        select 1 from todo_daily_completions c
        where c.todo_id = t.id and c.completion_date = today
      );

    if incomplete_count > 0 then
      perform net.http_post(
        url := push_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
        body := jsonb_build_object(
          'profileId', rec.profile_id,
          'title', 'Daily to-dos waiting ✅',
          'body', incomplete_count || ' task(s) not finished yet today',
          'url', '/'
        ),
        timeout_milliseconds := 15000
      );
    end if;
  end loop;
end;
$$;

create or replace function push_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  recipient record;
  preview text;
  push_url text;
  push_secret text;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then
    return new; -- not configured yet in this environment — no-op, don't block the insert
  end if;

  select id, app_foreground, app_foreground_at into recipient from profiles
  where couple_id = new.couple_id and id <> new.sender_profile_id
  limit 1;
  if recipient.id is null then return new; end if;
  if recipient.app_foreground and recipient.app_foreground_at > now() - interval '45 seconds' then
    return new;
  end if;

  select display_name into sender_name from profiles where id = new.sender_profile_id;
  preview := case
    when new.sticker is not null then new.sticker || ' Sent a sticker'
    when new.sticker_image_url is not null then '🎉 Sent a sticker'
    when new.image_url is not null then '📷 Sent a photo'
    when new.audio_url is not null then '🎤 Sent a voice message'
    else coalesce(new.text, '')
  end;

  perform net.http_post(
    url := push_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
    body := jsonb_build_object(
      'profileId', recipient.id,
      'title', coalesce(sender_name, 'New message'),
      'body', preview,
      'url', '/'
    ),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

create or replace function push_new_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  push_url text;
  push_secret text;
  actor_name text;
  recipient record;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
  if push_url is null or push_secret is null then return new; end if;

  if new.actor_profile_id is not null then
    select display_name into actor_name from profiles where id = new.actor_profile_id;
  end if;

  for recipient in
    select id, notify_prefs, app_foreground, app_foreground_at from profiles
    where couple_id = new.couple_id
      and (new.actor_profile_id is null or id <> new.actor_profile_id)
  loop
    if new.category is not null
       and coalesce((recipient.notify_prefs ->> new.category)::boolean, true) = false then
      continue;
    end if;

    if recipient.app_foreground and recipient.app_foreground_at > now() - interval '45 seconds' then
      continue;
    end if;

    perform net.http_post(
      url := push_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', push_secret),
      body := jsonb_build_object(
        'profileId', recipient.id,
        'title', coalesce(actor_name, 'Palvin'),
        'body', new.message,
        'url', '/'
      ),
      timeout_milliseconds := 15000
    );
  end loop;
  return new;
end;
$$;

notify pgrst, 'reload schema';
