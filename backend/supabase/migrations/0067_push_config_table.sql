-- PALVIN — Postgres hosted projects don't allow `alter database ... set`
-- from the connection role migrations run as, so push_new_chat_message()'s
-- config (the edge function URL + shared secret) lives in a locked-down
-- table instead of a GUC. RLS is enabled with zero policies, so it's
-- unreachable through PostgREST/the anon or authenticated roles — only
-- SECURITY DEFINER functions (which bypass RLS) or a direct SQL connection
-- can read it.

create table if not exists app_config (
  key   text primary key,
  value text not null
);

alter table app_config enable row level security;

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
  push_url text;
  push_secret text;
begin
  select value into push_url from app_config where key = 'push_function_url';
  select value into push_secret from app_config where key = 'push_secret';
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

notify pgrst, 'reload schema';

-- Run once by hand (not part of this migration — real secret values should
-- never be committed to git):
--   insert into app_config (key, value) values
--     ('push_function_url', 'https://<project-ref>.supabase.co/functions/v1/send-push'),
--     ('push_secret', '<same value as the INTERNAL_PUSH_SECRET function secret>')
--   on conflict (key) do update set value = excluded.value;
