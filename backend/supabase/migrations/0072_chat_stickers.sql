-- PALVIN — Sticker messages in chat. No sticker image assets/storage: a
-- "sticker" is just a chosen emoji rendered large with no bubble chrome
-- (frontend/src/screens/Chat.tsx), same trick apps like Messenger use for
-- single-emoji "stickers" — keeps this simple while still feeling distinct
-- from a normal text bubble.

alter table chat_messages add column if not exists sticker text;

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
