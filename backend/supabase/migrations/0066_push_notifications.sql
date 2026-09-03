-- PALVIN — Web Push notifications for chat messages.
-- Lets a new chat message reach the partner's phone as a real system
-- notification even when Palvin isn't open (installed-to-home-screen PWA
-- required on iOS — Apple doesn't allow Safari-tab push at all).
--
-- Deploy the "send-push" edge function separately (see
-- backend/supabase/functions/send-push/index.ts), then set:
--   npx supabase secrets set --project-ref qxzordcbytsogzvndmas \
--     VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... INTERNAL_PUSH_SECRET=...
-- and run the two `alter database` statements at the bottom of this file
-- (with the SAME service-role key / push secret) by hand once — they can't
-- ship as a normal migration since the value is a real secret.

create extension if not exists pg_net with schema extensions;

-- One row per browser/device subscribed to push, not per couple — a person
-- can have Palvin installed on more than one device.
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "own subscriptions only" on push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Fires the send-push edge function whenever a chat message is inserted,
-- targeting the RECIPIENT (not the sender) — mirrors notify_new_message-
-- style triggers elsewhere, just over HTTP instead of a notifications row.
create or replace function push_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  recipient_id uuid;
  preview text;
  push_url text := current_setting('app.settings.push_function_url', true);
  push_secret text := current_setting('app.settings.push_secret', true);
begin
  if push_url is null or push_secret is null then
    return new; -- not configured yet in this environment — no-op, don't block the insert
  end if;

  select id into recipient_id from profiles
  where couple_id = new.couple_id and id <> new.sender_profile_id
  limit 1;
  if recipient_id is null then return new; end if;

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
      'profileId', recipient_id,
      'title', coalesce(sender_name, 'New message'),
      'body', preview,
      'url', '/'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_chat_message_push on chat_messages;
create trigger on_chat_message_push
  after insert on chat_messages
  for each row execute function push_new_chat_message();

notify pgrst, 'reload schema';

-- Run once by hand after deploying the edge function (not part of the
-- migration itself — these are real secrets, never commit real values):
--   alter database postgres set app.settings.push_function_url = 'https://<project-ref>.supabase.co/functions/v1/send-push';
--   alter database postgres set app.settings.push_secret = '<same value as INTERNAL_PUSH_SECRET>';
