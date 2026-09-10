-- PALVIN — two fixes:
--
-- 1. notify_new_hug() still hardcoded "sent you a hug 🫂" / "is thinking of
--    you 💭" and always used 🫂 as the notification emoji, ignoring the
--    sender's customized Quick Actions label/emoji (0082_quick_action_prefs.sql).
--    Now reads the sender's quick_actions for the matching kind and falls
--    back to the original copy when a slot was never customized. The
--    existing on_notification_push trigger (0068) already pushes whatever
--    ends up in notifications.message/emoji, so this alone fixes both the
--    in-app bell and the push notification the partner receives.
--
-- 2. remind_incomplete_daily_todos() (0083) read its push config via
--    current_setting('app.settings.push_function_url'/'push_secret'), which
--    was the ORIGINAL 0066 approach — since superseded by the app_config
--    table (0068/push_new_chat_message's current definition), that setting
--    was never actually populated, so the reminder function has been a
--    silent no-op since it was created. Fixed to read from app_config,
--    matching every other push path in the project.

create or replace function notify_new_hug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  qa jsonb;
  label text;
  hug_emoji text;
begin
  select display_name, quick_actions -> new.kind into from_name, qa from profiles where id = new.from_profile_id;
  -- Same defaults as frontend/src/auth.ts's DEFAULT_QUICK_ACTIONS, so an
  -- account that never customized this still reads naturally.
  label := coalesce(qa ->> 'label', case when new.kind = 'thinking' then 'Thinking of you' else 'Send a hug' end);
  hug_emoji := coalesce(qa ->> 'emoji', case when new.kind = 'thinking' then '💭' else '🫂' end);
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text)
  values (new.couple_id, hug_emoji, coalesce(from_name, 'Someone') || ': ' || label, new.from_profile_id, 'home', new.message);
  return new;
end;
$$;

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
        )
      );
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
