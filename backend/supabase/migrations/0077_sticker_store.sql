-- PALVIN — Two more ways to send a "sticker" beyond the built-in emoji set:
--
-- 1. Custom stickers — the couple uploads their own images (inside jokes,
--    cropped photos of each other, ...) into a shared pack, same as
--    favourite-place/wish photos (couple-scoped storage, no new bucket).
-- 2. A real sticker/GIF search (Klipy — Tenor's near-identical successor
--    after Google shut Tenor's API down; see frontend/src/screens/Chat.tsx
--    and backend/supabase/functions/klipy-search) — these are just a
--    picked image URL, same as a custom sticker once sent.
--
-- Both land in chat_messages.sticker_image_url (a URL), kept distinct from
-- the existing `sticker` column (a raw emoji glyph) and from `image_url`
-- (a normal shared photo, rendered cropped/bubbled — a sticker renders big
-- and borderless like the emoji ones).

create table if not exists custom_stickers (
  id                     uuid primary key default gen_random_uuid(),
  couple_id              uuid not null references couples(id) on delete cascade default auth_couple_id(),
  image_url              text not null,
  created_by_profile_id  uuid not null references profiles(id) on delete cascade,
  created_at             timestamptz not null default now()
);

alter table custom_stickers alter column couple_id set default auth_couple_id();

alter table custom_stickers enable row level security;

create policy "couple full access" on custom_stickers for all
  using (couple_id = auth_couple_id()) with check (couple_id = auth_couple_id());

alter table chat_messages add column if not exists sticker_image_url text;

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
    )
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
