-- PALVIN — Land Bill and Savings-Goal notifications on the specific Money
-- tab they're about, instead of the Money screen's whatever-tab-was-last-open
-- default.
--
-- Audit of every notify_* trigger function's CURRENT definition (all of them
-- are superseded, verbatim except for translated message text, by
-- 0062_translate_notifications_to_english.sql — confirmed no notify_*
-- function or target_screen value is redefined by any later migration)
-- against the real case list in frontend/src/App.tsx's renderScreen found
-- no invalid/typo'd target_screen values — every one already matches a real
-- screen key. The only improvement available is tab-level precision within
-- Money, mirroring the existing 'stats' -> Money/Stats-tab trick (see
-- frontend/src/App.tsx's normalizedScreen and frontend/src/screens/Money.tsx's
-- screen-watching useEffect): 'bills' and 'goals' are new global screen keys
-- that normalize to the Money screen but additionally select the Bills tab
-- and the (savings) Goals tab respectively.
--
-- Only target_screen changes below (money -> bills / goals) — message text
-- and all other logic are copied verbatim from 0062.

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
  values (new.couple_id, new.emoji, coalesce(author_name, 'Someone') || ' added a recurring bill: ' || new.title, new.added_by_profile_id, 'bills');
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
  values (new.couple_id, coalesce(new.emoji, '🧾'), coalesce(actor_name, 'Someone') || ' updated a bill: ' || new.title, auth.uid(), 'bills');
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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a bill: ' || old.title, auth.uid(), 'bills');
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
  values (new.couple_id, '💰', coalesce(author_name, 'Someone') || ' created a new savings fund: ' || new.title, new.added_by_profile_id, 'goals');
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
  values (new.couple_id, coalesce(new.emoji, '💰'), coalesce(actor_name, 'Someone') || ' updated a savings fund: ' || new.title, auth.uid(), 'goals');
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
  values (old.couple_id, '🗑️', coalesce(actor_name, 'Someone') || ' deleted a savings fund: ' || old.title, auth.uid(), 'goals');
  return old;
end;
$$;

notify pgrst, 'reload schema';
