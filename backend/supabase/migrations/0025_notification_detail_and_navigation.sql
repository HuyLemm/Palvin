-- PALVIN — Richer notifications with tap-to-navigate
-- Scope: Notifications.tsx.
-- Adds who triggered each notification (to show a real avatar instead of
-- just a static emoji) and where tapping it should jump to. Re-creates every
-- existing notify_* trigger function (via create or replace) to populate the
-- new columns — no new triggers, same 7 events as before.

alter table notifications add column if not exists actor_profile_id uuid references profiles(id);
alter table notifications add column if not exists target_screen text;
alter table notifications add column if not exists target_id uuid;
alter table notifications add column if not exists preview_image_url text;
alter table notifications add column if not exists preview_text text;

-- Posts: jump straight to the post, with a thumbnail + caption snippet
-- (Instagram-style) so you can tell what it's about before opening it.
create or replace function notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.author_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url, preview_text)
  values (new.couple_id, '📸', coalesce(author_name, 'Ai đó') || ' vừa đăng một bài viết mới.', new.author_id, 'post-detail', new.id, new.image_urls[1], left(new.caption, 80));
  return new;
end;
$$;

-- Memories: jump straight to the memory, with its own photo as a thumbnail.
create or replace function notify_new_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url)
  values (new.couple_id, '🌸', coalesce(author_name, 'Ai đó') || ' đã thêm một kỷ niệm mới: ' || new.title, new.added_by_profile_id, 'memory-detail', new.id, new.image_url);
  return new;
end;
$$;

-- Love notes / letters: no per-note detail screen exists — jump to the
-- love-notes screen (lands the reader on the right general area).
create or replace function notify_new_love_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
  select display_name into sender_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text)
  values (new.couple_id, '💌', coalesce(sender_name, 'Ai đó') || ' đã gửi một love note.', new.from_profile_id, 'love-notes', left(new.message, 80));
  return new;
end;
$$;

create or replace function notify_new_love_letter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
  select display_name into sender_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text)
  values (new.couple_id, '💌', coalesce(sender_name, 'Ai đó') || ' đã viết cho bạn một bức thư tình.', new.from_profile_id, 'love-notes', new.title);
  return new;
end;
$$;

-- Date requests: DatePermit is a sub-screen inside Us.tsx's own local state,
-- not a top-level route — jump to "Us" (closest reachable screen).
create or replace function notify_new_date_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
begin
  select display_name into from_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text)
  values (new.couple_id, new.category_emoji, coalesce(from_name, 'Ai đó') || ' đã nộp đơn xin phép: ' || new.activity, new.from_profile_id, 'us', new.reason);
  return new;
end;
$$;

create or replace function notify_date_request_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  to_name text;
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    select display_name into from_name from profiles where id = new.from_profile_id;
    select display_name into to_name from profiles where id = new.to_profile_id;
    insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
    values (
      new.couple_id,
      case when new.status = 'approved' then '✅' else '❌' end,
      coalesce(to_name, 'Ai đó') || ' đã ' || (case when new.status = 'approved' then 'DUYỆT' else 'TỪ CHỐI' end)
        || ' đơn xin phép của ' || coalesce(from_name, 'Ai đó')
        || (case when new.response_note <> '' then ': "' || new.response_note || '"' else '' end),
      new.to_profile_id,
      'us'
    );
  end if;
  return new;
end;
$$;

-- Hugs: no detail screen — jump to Home, where the hug buttons live.
-- "kind" distinguishes the two buttons ("Gửi ôm" vs "Đang nghĩ đến em") so
-- the notification gets a short, distinct headline for each — the random
-- flavor text (new.message) goes in preview_text instead of being appended
-- to message, which used to make the toast (which shows message as-is) long.
alter table hugs add column if not exists kind text not null default 'hug';

create or replace function notify_new_hug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  headline text;
begin
  select display_name into from_name from profiles where id = new.from_profile_id;
  headline := case when new.kind = 'thinking'
    then coalesce(from_name, 'Ai đó') || ' đang nghĩ đến bạn 💭'
    else coalesce(from_name, 'Ai đó') || ' đã gửi cho bạn một cái ôm 🫂'
  end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text)
  values (new.couple_id, '🫂', headline, new.from_profile_id, 'home', new.message);
  return new;
end;
$$;

-- One-off cleanup: notifications created before this migration have no
-- target_screen (the column didn't exist yet), so tapping them can't
-- navigate anywhere — remove them rather than leave dead-end entries.
delete from notifications where target_screen is null;

notify pgrst, 'reload schema';
