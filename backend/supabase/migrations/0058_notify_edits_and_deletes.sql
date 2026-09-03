-- PALVIN — Every feature that notifies the partner on CREATE now also
-- notifies on EDIT and DELETE, matching whichever category (or none) its
-- creation trigger already uses. The actor is always auth.uid() — whoever
-- is actually performing the edit/delete right now — not the row's original
-- creator, since either partner can edit/delete shared rows.
--
-- Only added for tables that actually have an edit/delete action in the
-- app (memories, love_notes, secret_notes, hugs have neither, so nothing to
-- add there). Where a table has multiple different "update" call sites
-- (e.g. wishes: edit text vs. mark bought; goals: edit vs. contribute vs.
-- mark complete), one AFTER UPDATE trigger covers all of them — they're all
-- still just an UPDATE statement on the row.

-- ── Posts ──
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
  values (new.couple_id, '📸', coalesce(actor_name, 'Ai đó') || ' đã sửa một bài viết', auth.uid(), 'post-detail', new.id, new.image_urls[1], left(new.caption, 80));
  return new;
end;
$$;
drop trigger if exists on_post_updated on posts;
create trigger on_post_updated after update on posts for each row execute function notify_post_edited();

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một bài viết', auth.uid(), 'home');
  return old;
end;
$$;
drop trigger if exists on_post_deleted on posts;
create trigger on_post_deleted after delete on posts for each row execute function notify_post_deleted();

-- ── Expenses ──
create or replace function notify_expense_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; kind text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  kind := case when new.type = 'income' then 'khoản thu' else 'khoản chi' end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa ' || kind || ': ' || new.title, auth.uid(), 'money', 'expenses');
  return new;
end;
$$;
drop trigger if exists on_expense_updated on expenses;
create trigger on_expense_updated after update on expenses for each row execute function notify_expense_edited();

create or replace function notify_expense_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; kind text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  kind := case when old.type = 'income' then 'khoản thu' else 'khoản chi' end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa ' || kind || ': ' || old.title, auth.uid(), 'money', 'expenses');
  return old;
end;
$$;
drop trigger if exists on_expense_deleted on expenses;
create trigger on_expense_deleted after delete on expenses for each row execute function notify_expense_deleted();

-- ── Calendar Events ──
create or replace function notify_event_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa sự kiện: ' || new.title, auth.uid(), 'calendar', 'events');
  return new;
end;
$$;
drop trigger if exists on_event_updated on calendar_events;
create trigger on_event_updated after update on calendar_events for each row execute function notify_event_edited();

create or replace function notify_event_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa sự kiện: ' || old.title, auth.uid(), 'calendar', 'events');
  return old;
end;
$$;
drop trigger if exists on_event_deleted on calendar_events;
create trigger on_event_deleted after delete on calendar_events for each row execute function notify_event_deleted();

-- ── Date Requests (plain edits only — status-change responses already
--    have their own notify_date_request_response trigger from 0018/0029) ──
create or replace function notify_date_request_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa đơn xin phép: ' || new.activity, auth.uid(), 'us', new.id);
  return new;
end;
$$;
drop trigger if exists on_date_request_updated on date_requests;
create trigger on_date_request_updated after update on date_requests
  for each row when (new.status is not distinct from old.status)
  execute function notify_date_request_edited();

create or replace function notify_date_request_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa đơn xin phép: ' || old.activity, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_date_request_deleted on date_requests;
create trigger on_date_request_deleted after delete on date_requests for each row execute function notify_date_request_deleted();

-- ── Bills (edit + mark paid/unpaid are both just an UPDATE) ──
create or replace function notify_bill_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.emoji, '🧾'), coalesce(actor_name, 'Ai đó') || ' đã cập nhật hóa đơn: ' || new.title, auth.uid(), 'money');
  return new;
end;
$$;
drop trigger if exists on_bill_updated on bills;
create trigger on_bill_updated after update on bills for each row execute function notify_bill_edited();

create or replace function notify_bill_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa hóa đơn: ' || old.title, auth.uid(), 'money');
  return old;
end;
$$;
drop trigger if exists on_bill_deleted on bills;
create trigger on_bill_deleted after delete on bills for each row execute function notify_bill_deleted();

-- ── Savings Goals (edit + contribute/withdraw are both just an UPDATE) ──
create or replace function notify_savings_goal_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.emoji, '💰'), coalesce(actor_name, 'Ai đó') || ' đã cập nhật quỹ tiết kiệm: ' || new.title, auth.uid(), 'money');
  return new;
end;
$$;
drop trigger if exists on_savings_goal_updated on savings_goals;
create trigger on_savings_goal_updated after update on savings_goals for each row execute function notify_savings_goal_edited();

create or replace function notify_savings_goal_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa quỹ tiết kiệm: ' || old.title, auth.uid(), 'money');
  return old;
end;
$$;
drop trigger if exists on_savings_goal_deleted on savings_goals;
create trigger on_savings_goal_deleted after delete on savings_goals for each row execute function notify_savings_goal_deleted();

-- ── Gift Wishlist (edit + mark bought are both just an UPDATE) ──
create or replace function notify_wish_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '🎁', coalesce(actor_name, 'Ai đó') || ' đã cập nhật một điều ước: ' || new.wish, auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_wish_updated on wishes;
create trigger on_wish_updated after update on wishes for each row execute function notify_wish_edited();

create or replace function notify_wish_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một điều ước: ' || old.wish, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_wish_deleted on wishes;
create trigger on_wish_deleted after delete on wishes for each row execute function notify_wish_deleted();

-- ── Gratitude Journal ──
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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa một điều biết ơn', auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_gratitude_updated on gratitude_entries;
create trigger on_gratitude_updated after update on gratitude_entries for each row execute function notify_gratitude_edited();

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một điều biết ơn', auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_gratitude_deleted on gratitude_entries;
create trigger on_gratitude_deleted after delete on gratitude_entries for each row execute function notify_gratitude_deleted();

-- ── Time Capsule (edit + open are both just an UPDATE) ──
create or replace function notify_capsule_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '💌', coalesce(actor_name, 'Ai đó') || ' đã cập nhật một Time Capsule: ' || new.title, auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_capsule_updated on capsules;
create trigger on_capsule_updated after update on capsules for each row execute function notify_capsule_edited();

create or replace function notify_capsule_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một Time Capsule: ' || old.title, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_capsule_deleted on capsules;
create trigger on_capsule_deleted after delete on capsules for each row execute function notify_capsule_deleted();

-- ── Future Us (edit + contribute + mark complete are all just an UPDATE) ──
create or replace function notify_goal_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.emoji, '✨'), coalesce(actor_name, 'Ai đó') || ' đã cập nhật mục tiêu: ' || new.title, auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_goal_updated on goals;
create trigger on_goal_updated after update on goals for each row execute function notify_goal_edited();

create or replace function notify_goal_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa mục tiêu: ' || old.title, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_goal_deleted on goals;
create trigger on_goal_deleted after delete on goals for each row execute function notify_goal_deleted();

-- ── Story Quotes ──
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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa một câu nói', auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_story_quote_updated on story_quotes;
create trigger on_story_quote_updated after update on story_quotes for each row execute function notify_story_quote_edited();

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một câu nói', auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_story_quote_deleted on story_quotes;
create trigger on_story_quote_deleted after delete on story_quotes for each row execute function notify_story_quote_deleted();

-- ── Cycle Log ──
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
  values (new.couple_id, '🌸', coalesce(actor_name, 'Ai đó') || ' đã cập nhật một kỳ kinh', auth.uid(), 'calendar');
  return new;
end;
$$;
drop trigger if exists on_cycle_log_updated on cycle_logs;
create trigger on_cycle_log_updated after update on cycle_logs for each row execute function notify_cycle_log_edited();

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một kỳ kinh', auth.uid(), 'calendar');
  return old;
end;
$$;
drop trigger if exists on_cycle_log_deleted on cycle_logs;
create trigger on_cycle_log_deleted after delete on cycle_logs for each row execute function notify_cycle_log_deleted();

-- ── Trip Planner ──
create or replace function notify_trip_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.emoji, '✈️'), coalesce(actor_name, 'Ai đó') || ' đã sửa chuyến đi: ' || new.title, auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_trip_updated on trips;
create trigger on_trip_updated after update on trips for each row execute function notify_trip_edited();

create or replace function notify_trip_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa chuyến đi: ' || old.title, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_trip_deleted on trips;
create trigger on_trip_deleted after delete on trips for each row execute function notify_trip_deleted();

-- ── Our Favourites (places) ──
create or replace function notify_fav_place_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Ai đó') || ' đã sửa địa điểm yêu thích: ' || new.name, auth.uid(), 'us');
  return new;
end;
$$;
drop trigger if exists on_fav_place_updated on fav_places;
create trigger on_fav_place_updated after update on fav_places for each row execute function notify_fav_place_edited();

create or replace function notify_fav_place_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa địa điểm yêu thích: ' || old.name, auth.uid(), 'us');
  return old;
end;
$$;
drop trigger if exists on_fav_place_deleted on fav_places;
create trigger on_fav_place_deleted after delete on fav_places for each row execute function notify_fav_place_deleted();

-- ── Love Letters (delete only — no edit exists in the app) ──
create or replace function notify_love_letter_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Ai đó') || ' đã xóa một bức thư tình', auth.uid(), 'love-notes', 'love');
  return old;
end;
$$;
drop trigger if exists on_love_letter_deleted on love_letters;
create trigger on_love_letter_deleted after delete on love_letters for each row execute function notify_love_letter_deleted();

notify pgrst, 'reload schema';
