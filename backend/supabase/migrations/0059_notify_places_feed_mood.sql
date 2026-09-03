-- PALVIN — Notify the partner for 3 more areas the user explicitly asked
-- for: Our Places (create/edit/delete), Feed interactions — like/save/
-- comment/reaction (create + delete; these have no "edit" concept), and
-- daily mood check-ins (insert or upsert-update — there's no delete).
-- No category tag on any of these (always shown), matching the "no
-- category needed" instruction from the Our Places / money-etc batch.

alter table places add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();

-- ── Our Places ──
create or replace function notify_new_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.flag, '🗺️'), coalesce(actor_name, 'Ai đó') || ' đã thêm một nơi đã đi qua: ' || new.name, new.added_by_profile_id, 'us');
  return new;
end;
$$;
drop trigger if exists on_place_created on places;
create trigger on_place_created after insert on places for each row execute function notify_new_place();

create or replace function notify_place_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa địa điểm: ' || new.name, auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_place_updated on places;
create trigger on_place_updated after update on places for each row execute function notify_place_edited();

create or replace function notify_place_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa địa điểm: ' || old.name, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_place_deleted on places;
create trigger on_place_deleted after delete on places for each row execute function notify_place_deleted();

-- ── Feed: likes ──
create or replace function notify_post_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid; v_caption text; v_image text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id, caption, image_urls[1] into v_couple_id, v_caption, v_image from posts where id = new.post_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url, preview_text)
  values (v_couple_id, '❤️', coalesce(actor_name, 'Ai đó') || ' đã thích bài viết của bạn', auth.uid(), 'post-detail', new.post_id, v_image, left(v_caption, 80));
  return new;
end;
$$;
drop trigger if exists on_post_liked on post_likes;
create trigger on_post_liked after insert on post_likes for each row execute function notify_post_liked();

create or replace function notify_post_unliked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, '💔', coalesce(actor_name, 'Ai đó') || ' đã bỏ thích bài viết', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;
drop trigger if exists on_post_unliked on post_likes;
create trigger on_post_unliked after delete on post_likes for each row execute function notify_post_unliked();

-- ── Feed: saves ──
create or replace function notify_post_saved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid; v_caption text; v_image text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id, caption, image_urls[1] into v_couple_id, v_caption, v_image from posts where id = new.post_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url, preview_text)
  values (v_couple_id, '🔖', coalesce(actor_name, 'Ai đó') || ' đã lưu bài viết của bạn', auth.uid(), 'post-detail', new.post_id, v_image, left(v_caption, 80));
  return new;
end;
$$;
drop trigger if exists on_post_saved on post_saves;
create trigger on_post_saved after insert on post_saves for each row execute function notify_post_saved();

create or replace function notify_post_unsaved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, '🔖', coalesce(actor_name, 'Ai đó') || ' đã bỏ lưu bài viết', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;
drop trigger if exists on_post_unsaved on post_saves;
create trigger on_post_unsaved after delete on post_saves for each row execute function notify_post_unsaved();

-- ── Feed: comments (no edit/delete exists in the app) ──
create or replace function notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid; v_image text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id, image_urls[1] into v_couple_id, v_image from posts where id = new.post_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url, preview_text)
  values (v_couple_id, '💬', coalesce(actor_name, 'Ai đó') || ' đã bình luận: ' || left(new.text, 80), auth.uid(), 'post-detail', new.post_id, v_image, left(new.text, 80));
  return new;
end;
$$;
drop trigger if exists on_comment_created on post_comments;
create trigger on_comment_created after insert on post_comments for each row execute function notify_new_comment();

-- ── Feed: reactions ──
create or replace function notify_reaction_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = new.post_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, new.emoji, coalesce(actor_name, 'Ai đó') || ' đã thả ' || new.emoji || ' vào bài viết của bạn', auth.uid(), 'post-detail', new.post_id);
  return new;
end;
$$;
drop trigger if exists on_reaction_added on post_reactions;
create trigger on_reaction_added after insert on post_reactions for each row execute function notify_reaction_added();

create or replace function notify_reaction_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, old.emoji, coalesce(actor_name, 'Ai đó') || ' đã bỏ ' || old.emoji || ' khỏi bài viết', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;
drop trigger if exists on_reaction_removed on post_reactions;
create trigger on_reaction_removed after delete on post_reactions for each row execute function notify_reaction_removed();

-- ── Mood check-in (upsert: insert first time each day, update if changed
--    again the same day — no delete exists) ──
create or replace function notify_mood_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, new.emoji, coalesce(actor_name, 'Ai đó') || ' vừa cập nhật tâm trạng: ' || new.label, auth.uid(), 'home');
  return new;
end;
$$;
drop trigger if exists on_mood_set on mood_entries;
create trigger on_mood_set after insert or update on mood_entries for each row execute function notify_mood_set();

notify pgrst, 'reload schema';
