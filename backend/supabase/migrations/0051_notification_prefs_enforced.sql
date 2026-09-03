-- PALVIN — Make Settings' notification toggles actually do something.
-- Previously `profiles.notify_prefs` (0003_notifications.sql) was written on
-- toggle but never read by anything — every notification always showed for
-- both partners regardless of the 4 switches in Settings > Notifications.
--
-- Fix: tag each notification with a `category` matching one of the 4
-- toggles (love / memories / expenses / events); the frontend (notifications.ts)
-- now filters what it fetches/receives for a given viewer by that viewer's
-- own notify_prefs. Categories with no toggle (posts, hugs, date requests)
-- stay untagged (category is null) and always show, unchanged from before.
--
-- Also adds real notification triggers for expenses and calendar events —
-- neither ever pushed one (see 0006_calendar.sql / 0007_money.sql "no notify
-- trigger here" comments) which is exactly why "Expenses" and "Events &
-- reminders" looked like dead toggles: there was nothing for them to control.

alter table notifications add column if not exists category text;

-- default auth.uid() so existing insert code (money.ts/calendar.ts) needs no
-- change — the column just fills itself in from the authenticated caller.
alter table expenses add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();
alter table calendar_events add column if not exists added_by_profile_id uuid references profiles(id) default auth.uid();

-- Tag the existing memory/love-note/love-letter triggers with their category.
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
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_image_url, category)
  values (new.couple_id, '🌸', coalesce(author_name, 'Ai đó') || ' đã thêm một kỷ niệm mới: ' || new.title, new.added_by_profile_id, 'memory-detail', new.id, new.image_url, 'memories');
  return new;
end;
$$;

create or replace function notify_new_love_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare sender_name text;
begin
  select display_name into sender_name from profiles where id = new.from_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text, category)
  values (new.couple_id, '💌', coalesce(sender_name, 'Ai đó') || ' đã gửi một love note.', new.from_profile_id, 'love-notes', left(new.message, 80), 'love');
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
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text, category)
  values (new.couple_id, '💌', coalesce(sender_name, 'Ai đó') || ' đã viết cho bạn một bức thư tình.', new.from_profile_id, 'love-notes', new.title, 'love');
  return new;
end;
$$;

-- New: notify on a new expense/income entry.
create or replace function notify_new_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
  headline text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  headline := case when new.type = 'income'
    then coalesce(author_name, 'Ai đó') || ' vừa ghi nhận một khoản thu: ' || new.title
    else coalesce(author_name, 'Ai đó') || ' vừa thêm một khoản chi: ' || new.title
  end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '💰', headline, new.added_by_profile_id, 'money', 'expenses');
  return new;
end;
$$;

drop trigger if exists on_expense_created on expenses;
create trigger on_expense_created
  after insert on expenses
  for each row execute function notify_new_expense();

-- New: notify on a new calendar event.
create or replace function notify_new_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_name text;
begin
  select display_name into author_name from profiles where id = new.added_by_profile_id;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '📅', coalesce(author_name, 'Ai đó') || ' đã thêm sự kiện: ' || new.title, new.added_by_profile_id, 'calendar', 'events');
  return new;
end;
$$;

drop trigger if exists on_event_created on calendar_events;
create trigger on_event_created
  after insert on calendar_events
  for each row execute function notify_new_event();

notify pgrst, 'reload schema';
