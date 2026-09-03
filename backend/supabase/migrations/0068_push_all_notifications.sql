-- PALVIN — Extends Web Push to every notification type, not just chat
-- (posts, memories, expenses, events, hugs, love notes, reactions, ...) —
-- one shared trigger on the `notifications` table itself, since every one
-- of the ~58 notify_* trigger functions already funnels through an insert
-- there. Respects the exact same per-category opt-outs as the in-app
-- bell/toast (frontend/src/notifications.ts's passesNotifyPrefs): a
-- category with no matching Settings toggle always pushes, one that does
-- only pushes while that toggle is on for the recipient.

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
    select id, notify_prefs from profiles
    where couple_id = new.couple_id
      and (new.actor_profile_id is null or id <> new.actor_profile_id)
  loop
    if new.category is not null
       and coalesce((recipient.notify_prefs ->> new.category)::boolean, true) = false then
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

drop trigger if exists on_notification_push on notifications;
create trigger on_notification_push
  after insert on notifications
  for each row execute function push_new_notification();

notify pgrst, 'reload schema';
