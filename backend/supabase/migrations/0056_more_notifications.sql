-- PALVIN — Notify the partner for 10 more feature areas: Money (bills +
-- savings goals — expenses already notified since 0051), Gift Wishlist,
-- Gratitude Journal, Time Capsule, Future Us, Secret Notes, Story Quotes,
-- Cycle Log, Trip Planner, Our Favourites.
--
-- None of these get a `category` tag — they're always shown, same as posts/
-- hugs/date-permit, not gated by a Settings > Notifications toggle.
--
-- Several of these tables never tracked who added a row at all — add
-- `added_by_profile_id default auth.uid()` so existing insert code needs no
-- change (mirrors 0051's expenses/calendar_events additions).

alter table bills          add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table savings_goals  add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table goals          add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table trips          add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table fav_places     add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table story_quotes   add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table cycle_logs     add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();

-- ── Money: bills + savings goals ──
create or replace function notify_new_bill()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, new.emoji, coalesce(author_name, 'Ai đó') || ' đã thêm hóa đơn định kỳ: ' || new.title, new.added_by_profile_id, 'money');
  return new;
end;
$$;

drop trigger if exists on_bill_created on bills;
create trigger on_bill_created
  after insert on bills
  for each row execute function notify_new_bill();

create or replace function notify_new_savings_goal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '💰', coalesce(author_name, 'Ai đó') || ' đã tạo quỹ tiết kiệm mới: ' || new.title, new.added_by_profile_id, 'money');
  return new;
end;
$$;

drop trigger if exists on_savings_goal_created on savings_goals;
create trigger on_savings_goal_created
  after insert on savings_goals
  for each row execute function notify_new_savings_goal();

-- ── Gift Wishlist ──
create or replace function notify_new_wish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '🎁', coalesce(author_name, 'Ai đó') || ' đã thêm một điều ước vào Gift Wishlist: ' || new.wish, new.from_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_wish_created on wishes;
create trigger on_wish_created
  after insert on wishes
  for each row execute function notify_new_wish();

-- ── Gratitude Journal ──
create or replace function notify_new_gratitude()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '🌸', coalesce(author_name, 'Ai đó') || ' đã ghi một điều biết ơn mới', new.from_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_gratitude_created on gratitude_entries;
create trigger on_gratitude_created
  after insert on gratitude_entries
  for each row execute function notify_new_gratitude();

-- ── Time Capsule ── (content stays sealed — the notification doesn't reveal the message)
create or replace function notify_new_capsule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '💌', coalesce(author_name, 'Ai đó') || ' đã gửi một Time Capsule mới cho bạn', new.from_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_capsule_created on capsules;
create trigger on_capsule_created
  after insert on capsules
  for each row execute function notify_new_capsule();

-- ── Future Us ──
create or replace function notify_new_goal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.emoji, '✨'), coalesce(author_name, 'Ai đó') || ' đã thêm một mục tiêu mới: ' || new.title, new.added_by_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_goal_created on goals;
create trigger on_goal_created
  after insert on goals
  for each row execute function notify_new_goal();

-- ── Secret Notes ── (message stays hidden until unlock_date)
create or replace function notify_new_secret_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '🔐', coalesce(author_name, 'Ai đó') || ' đã viết một ghi chú bí mật cho bạn', new.from_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_secret_note_created on secret_notes;
create trigger on_secret_note_created
  after insert on secret_notes
  for each row execute function notify_new_secret_note();

-- ── Story Quotes ──
create or replace function notify_new_story_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '💬', coalesce(author_name, 'Ai đó') || ' đã thêm một câu nói mới', new.added_by_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_story_quote_created on story_quotes;
create trigger on_story_quote_created
  after insert on story_quotes
  for each row execute function notify_new_story_quote();

-- ── Cycle Log ──
create or replace function notify_new_cycle_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '🌸', coalesce(author_name, 'Ai đó') || ' đã ghi nhận một kỳ kinh mới', new.added_by_profile_id, 'calendar');
  return new;
end;
$$;

drop trigger if exists on_cycle_log_created on cycle_logs;
create trigger on_cycle_log_created
  after insert on cycle_logs
  for each row execute function notify_new_cycle_log();

-- ── Trip Planner ──
create or replace function notify_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, coalesce(new.emoji, '✈️'), coalesce(author_name, 'Ai đó') || ' đã tạo chuyến đi mới: ' || new.title, new.added_by_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_trip_created on trips;
create trigger on_trip_created
  after insert on trips
  for each row execute function notify_new_trip();

-- ── Our Favourites (places) ──
create or replace function notify_new_fav_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen)
  values (new.couple_id, '📍', coalesce(author_name, 'Ai đó') || ' đã thêm một địa điểm yêu thích: ' || new.name, new.added_by_profile_id, 'us');
  return new;
end;
$$;

drop trigger if exists on_fav_place_created on fav_places;
create trigger on_fav_place_created
  after insert on fav_places
  for each row execute function notify_new_fav_place();

notify pgrst, 'reload schema';
