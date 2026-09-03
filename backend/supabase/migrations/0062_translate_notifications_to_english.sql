-- PALVIN — Translate every notification message template from Vietnamese to
-- English (the frontend UI was just fully translated; these Postgres
-- trigger functions generate the `notifications.message` text shown in the
-- bell, realtime toasts, and the new admin activity log — they live in the
-- database, so no frontend-only translation pass could reach them).
--
-- Every function below is copied verbatim from its most recent definition
-- (migrations 0003, 0005, 0008, 0018, 0021, 0025, 0029, 0051, 0056, 0058,
-- 0059, 0061) with ONLY the message string content translated — same
-- columns, same logic, same category/target_screen values, same triggers.

-- ── Posts ──
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
  values (new.couple_id, '📸', coalesce(author_name, 'Someone') || ' just posted something new.', new.author_id, 'post-detail', new.id, new.image_urls[1], left(new.caption, 80));
  return new;
end;
$$;

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
  values (new.couple_id, '📸', coalesce(actor_name, 'Someone') || ' edited a post: ' || left(new.caption, 60), auth.uid(), 'post-detail', new.id, new.image_urls[1], left(new.caption, 80));
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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a post: ' || left(old.caption, 60), auth.uid(), 'home');
  return old;
end;
$$;

-- ── Memories ──
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
  values (new.couple_id, '🌸', coalesce(author_name, 'Someone') || ' added a new memory: ' || new.title, new.added_by_profile_id, 'memory-detail', new.id, new.image_url, 'memories');
  return new;
end;
$$;

-- ── Love notes / letters ──
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
  values (new.couple_id, '💌', coalesce(sender_name, 'Someone') || ' sent you a love note.', new.from_profile_id, 'love-notes', left(new.message, 80), 'love');
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
  values (new.couple_id, '💌', coalesce(sender_name, 'Someone') || ' wrote you a love letter.', new.from_profile_id, 'love-notes', new.title, 'love');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a love letter', auth.uid(), 'love-notes', 'love');
  return old;
end;
$$;

-- ── Date requests ("Permission Slip") ──
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
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id, preview_text)
  values (new.couple_id, new.category_emoji, coalesce(from_name, 'Someone') || ' submitted a permission request: ' || new.activity, new.from_profile_id, 'us', new.id, new.reason);
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
    insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
    values (
      new.couple_id,
      case when new.status = 'approved' then '✅' else '❌' end,
      coalesce(to_name, 'Someone') || ' ' || (case when new.status = 'approved' then 'APPROVED' else 'REJECTED' end)
        || ' ' || coalesce(from_name, 'Someone') || '''s permission request'
        || (case when new.response_note <> '' then ': "' || new.response_note || '"' else '' end),
      new.to_profile_id,
      'us',
      new.id
    );
  end if;
  return new;
end;
$$;

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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited a permission request: ' || new.activity, auth.uid(), 'us', new.id);
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a permission request: ' || old.activity, auth.uid(), 'us');
  return old;
end;
$$;

-- ── Hugs ──
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
    then coalesce(from_name, 'Someone') || ' is thinking of you 💭'
    else coalesce(from_name, 'Someone') || ' sent you a hug 🫂'
  end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, preview_text)
  values (new.couple_id, '🫂', headline, new.from_profile_id, 'home', new.message);
  return new;
end;
$$;

-- ── Expenses ──
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
    then coalesce(author_name, 'Someone') || ' logged some income: ' || new.title
    else coalesce(author_name, 'Someone') || ' added an expense: ' || new.title
  end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '💰', headline, new.added_by_profile_id, 'money', 'expenses');
  return new;
end;
$$;

create or replace function notify_expense_edited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; kind text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  kind := case when new.type = 'income' then 'income entry' else 'expense' end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited an ' || kind || ': ' || new.title, auth.uid(), 'money', 'expenses');
  return new;
end;
$$;

create or replace function notify_expense_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; kind text;
begin
  select display_name into actor_name from profiles where id = auth.uid();
  kind := case when old.type = 'income' then 'income entry' else 'expense' end;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, category)
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted an ' || kind || ': ' || old.title, auth.uid(), 'money', 'expenses');
  return old;
end;
$$;

-- ── Calendar events ──
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
  values (new.couple_id, '📅', coalesce(author_name, 'Someone') || ' added an event: ' || new.title, new.added_by_profile_id, 'calendar', 'events');
  return new;
end;
$$;

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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited an event: ' || new.title, auth.uid(), 'calendar', 'events');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted an event: ' || old.title, auth.uid(), 'calendar', 'events');
  return old;
end;
$$;

-- ── Bills ──
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
  values (new.couple_id, new.emoji, coalesce(author_name, 'Someone') || ' added a recurring bill: ' || new.title, new.added_by_profile_id, 'money');
  return new;
end;
$$;

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
  values (new.couple_id, coalesce(new.emoji, '🧾'), coalesce(actor_name, 'Someone') || ' updated a bill: ' || new.title, auth.uid(), 'money');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a bill: ' || old.title, auth.uid(), 'money');
  return old;
end;
$$;

-- ── Savings goals ──
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
  values (new.couple_id, '💰', coalesce(author_name, 'Someone') || ' created a new savings fund: ' || new.title, new.added_by_profile_id, 'money');
  return new;
end;
$$;

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
  values (new.couple_id, coalesce(new.emoji, '💰'), coalesce(actor_name, 'Someone') || ' updated a savings fund: ' || new.title, auth.uid(), 'money');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a savings fund: ' || old.title, auth.uid(), 'money');
  return old;
end;
$$;

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
  values (new.couple_id, '🎁', coalesce(author_name, 'Someone') || ' added a wish to the Gift Wishlist: ' || new.wish, new.from_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, '🎁', coalesce(actor_name, 'Someone') || ' updated a wish: ' || new.wish, auth.uid(), 'us');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a wish: ' || old.wish, auth.uid(), 'us');
  return old;
end;
$$;

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
  values (new.couple_id, '🌸', coalesce(author_name, 'Someone') || ' logged something they''re grateful for', new.from_profile_id, 'us');
  return new;
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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited a gratitude entry: ' || left(new.text, 60), auth.uid(), 'us');
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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a gratitude entry: ' || left(old.text, 60), auth.uid(), 'us');
  return old;
end;
$$;

-- ── Time Capsule ──
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
  values (new.couple_id, '💌', coalesce(author_name, 'Someone') || ' sent you a new Time Capsule', new.from_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, '💌', coalesce(actor_name, 'Someone') || ' updated a Time Capsule: ' || new.title, auth.uid(), 'us');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a Time Capsule: ' || old.title, auth.uid(), 'us');
  return old;
end;
$$;

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
  values (new.couple_id, coalesce(new.emoji, '✨'), coalesce(author_name, 'Someone') || ' added a new goal: ' || new.title, new.added_by_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, coalesce(new.emoji, '✨'), coalesce(actor_name, 'Someone') || ' updated a goal: ' || new.title, auth.uid(), 'us');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a goal: ' || old.title, auth.uid(), 'us');
  return old;
end;
$$;

-- ── Secret Notes ──
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
  values (new.couple_id, '🔐', coalesce(author_name, 'Someone') || ' wrote you a secret note', new.from_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, '💬', coalesce(author_name, 'Someone') || ' added a new quote', new.added_by_profile_id, 'us');
  return new;
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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited a quote: "' || left(new.text, 50) || '"', auth.uid(), 'us');
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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a quote: "' || left(old.text, 50) || '"', auth.uid(), 'us');
  return old;
end;
$$;

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
  values (new.couple_id, '🌸', coalesce(author_name, 'Someone') || ' logged a new period', new.added_by_profile_id, 'calendar');
  return new;
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
  values (new.couple_id, '🌸', coalesce(actor_name, 'Someone') || ' updated the period starting ' || to_char(new.start_date, 'MM/DD'), auth.uid(), 'calendar');
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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted the period starting ' || to_char(old.start_date, 'MM/DD'), auth.uid(), 'calendar');
  return old;
end;
$$;

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
  values (new.couple_id, coalesce(new.emoji, '✈️'), coalesce(author_name, 'Someone') || ' created a new trip: ' || new.title, new.added_by_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, coalesce(new.emoji, '✈️'), coalesce(actor_name, 'Someone') || ' edited a trip: ' || new.title, auth.uid(), 'us');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a trip: ' || old.title, auth.uid(), 'us');
  return old;
end;
$$;

-- ── Our Favourites (categorised places) ──
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
  values (new.couple_id, '📍', coalesce(author_name, 'Someone') || ' added a favourite place: ' || new.name, new.added_by_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited a favourite place: ' || new.name, auth.uid(), 'us');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a favourite place: ' || old.name, auth.uid(), 'us');
  return old;
end;
$$;

-- ── Our Places ("Places We've Been") ──
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
  values (new.couple_id, coalesce(new.flag, '🗺️'), coalesce(actor_name, 'Someone') || ' added a place you''ve been: ' || new.name, new.added_by_profile_id, 'us');
  return new;
end;
$$;

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
  values (new.couple_id, '✏️', coalesce(actor_name, 'Someone') || ' edited a place: ' || new.name, auth.uid(), 'us');
  return new;
end;
$$;

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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a place: ' || old.name, auth.uid(), 'us');
  return old;
end;
$$;

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
  values (v_couple_id, '❤️', coalesce(actor_name, 'Someone') || ' liked your post', auth.uid(), 'post-detail', new.post_id, v_image, left(v_caption, 80));
  return new;
end;
$$;

create or replace function notify_post_unliked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  if pg_trigger_depth() > 1 then return old; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, '💔', coalesce(actor_name, 'Someone') || ' unliked a post', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;

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
  values (v_couple_id, '🔖', coalesce(actor_name, 'Someone') || ' saved your post', auth.uid(), 'post-detail', new.post_id, v_image, left(v_caption, 80));
  return new;
end;
$$;

create or replace function notify_post_unsaved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  if pg_trigger_depth() > 1 then return old; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, '🔖', coalesce(actor_name, 'Someone') || ' unsaved a post', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;

-- ── Feed: comments ──
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
  values (v_couple_id, '💬', coalesce(actor_name, 'Someone') || ' commented: ' || left(new.text, 80), auth.uid(), 'post-detail', new.post_id, v_image, left(new.text, 80));
  return new;
end;
$$;

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
  values (v_couple_id, new.emoji, coalesce(actor_name, 'Someone') || ' reacted ' || new.emoji || ' to your post', auth.uid(), 'post-detail', new.post_id);
  return new;
end;
$$;

create or replace function notify_reaction_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text; v_couple_id uuid;
begin
  if pg_trigger_depth() > 1 then return old; end if;
  select display_name into actor_name from profiles where id = auth.uid();
  select couple_id into v_couple_id from posts where id = old.post_id;
  if v_couple_id is null then return old; end if;
  insert into notifications (couple_id, emoji, message, actor_profile_id, target_screen, target_id)
  values (v_couple_id, old.emoji, coalesce(actor_name, 'Someone') || ' removed their ' || old.emoji || ' from a post', auth.uid(), 'post-detail', old.post_id);
  return old;
end;
$$;

-- ── Mood check-in ──
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
  values (new.couple_id, new.emoji, coalesce(actor_name, 'Someone') || ' updated their mood: ' || new.label, auth.uid(), 'home');
  return new;
end;
$$;

notify pgrst, 'reload schema';
