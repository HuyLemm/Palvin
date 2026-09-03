-- PALVIN — Edit/delete notifications for Posts, Gratitude and Story Quotes
-- were too generic ("đã sửa một bài viết", no caption) to be useful in the
-- new activity log (Settings > Nhật ký chỉnh sửa & xóa) — add a content
-- snippet to each, same as expenses/events/wishes/etc. already had.

create or replace function notify_post_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url, preview_text)
  values (new.couple_id, '📸', coalesce(actor_name, 'Ai đó') || ' đã sửa bài viết: ' || left(new.caption, 60), auth.uid(), 'post-detail', new.id, new.image_urls[1], left(new.caption, 80));
  return new;
end;
$$;

create or replace function notify_post_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa bài viết: ' || left(old.caption, 60), auth.uid(), 'home');
  return old;
end;
$$;

create or replace function notify_gratitude_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa một điều biết ơn: ' || left(new.text, 60), auth.uid(), 'us');
  return new;
end;
$$;

create or replace function notify_gratitude_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một điều biết ơn: ' || left(old.text, 60), auth.uid(), 'us');
  return old;
end;
$$;

create or replace function notify_story_quote_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa một câu nói: "' || left(new.text, 50) || '"', auth.uid(), 'us');
  return new;
end;
$$;

create or replace function notify_story_quote_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một câu nói: "' || left(old.text, 50) || '"', auth.uid(), 'us');
  return old;
end;
$$;

create or replace function notify_cycle_log_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '🌸', coalesce(actor_name, 'Ai đó') || ' đã cập nhật kỳ kinh bắt đầu ' || to_char(new.start_date, 'DD/MM'), auth.uid(), 'calendar');
  return new;
end;
$$;

create or replace function notify_cycle_log_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa kỳ kinh bắt đầu ' || to_char(old.start_date, 'DD/MM'), auth.uid(), 'calendar');
  return old;
end;
$$;

notify pgrst, 'reload schema';
