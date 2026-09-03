-- PALVIN — Don't send a Web Push notification to someone who currently has
-- the app open and visible; only push once they've backgrounded/closed it.
-- The client reports foreground state via the Page Visibility API
-- (touchForegroundState in auth.ts) with a periodic heartbeat while visible;
-- app_foreground_at must be recent for the flag to be trusted, so a crashed
-- tab that never fired "hidden" naturally goes stale and pushes resume.

alter table profiles add column if not exists app_foreground boolean not null default false;
alter table profiles add column if not exists app_foreground_at timestamptz;

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
      )
    );
  end loop;
  return new;
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
    )
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
